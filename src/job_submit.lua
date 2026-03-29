--[[
SlurmLedger Job Submit Plugin
Enforces allocation budgets at job submission time.

Install:
  cp job_submit.lua /etc/slurm/job_submit.lua
  Add to slurm.conf: JobSubmitPlugins=lua
  scontrol reconfigure

Config: Reads /etc/slurmledger/rates.json for allocation data.
]]--

-- Configuration
local RATES_PATH = "/etc/slurmledger/rates.json"
local LOG_PREFIX = "SlurmLedger"
local ENABLE_ENFORCEMENT = true  -- Set to false for audit-only mode

-- Helper: read JSON file
-- Note: SLURM's Lua environment is minimal — no json library.
-- We parse the allocations section with pattern matching.
function read_allocations()
    local f = io.open(RATES_PATH, "r")
    if not f then
        slurm.log_info("%s: Cannot read %s — enforcement disabled", LOG_PREFIX, RATES_PATH)
        return nil
    end
    local content = f:read("*all")
    f:close()
    return content
end

-- Helper: extract allocation for an account from the JSON
-- Simple pattern matching since we don't have a full JSON parser
function get_allocation(content, account)
    -- Look for "account_name": { ... "type": "prepaid", "budget_su": N ... }
    -- This is fragile but works for the known rates.json schema
    local pattern = '"' .. account .. '"%s*:%s*{(.-)}'
    local block = content:match(pattern)
    if not block then return nil end

    local alloc_type = block:match('"type"%s*:%s*"(%w+)"')
    if alloc_type ~= "prepaid" then return nil end

    local budget = tonumber(block:match('"budget_su"%s*:%s*(%d+)'))
    if not budget or budget <= 0 then return nil end

    local carryover = tonumber(block:match('"carryover_su"%s*:%s*(%d+)')) or 0

    -- Parse alert thresholds
    local alerts_str = block:match('"alerts"%s*:%s*%[(.-)%]')
    local alert_threshold = 100  -- default: only block at 100%
    if alerts_str then
        for num in alerts_str:gmatch("(%d+)") do
            local n = tonumber(num)
            if n and n >= 100 then
                alert_threshold = n
                break
            end
        end
    end

    -- Check date boundaries
    local start_date = block:match('"start_date"%s*:%s*"(%d%d%d%d%-%d%d%-%d%d)"')
    local end_date = block:match('"end_date"%s*:%s*"(%d%d%d%d%-%d%d%-%d%d)"')

    return {
        budget = budget + carryover,
        start_date = start_date,
        end_date = end_date,
        alert_threshold = alert_threshold,
    }
end

-- Helper: get current account usage via sacct
function get_account_usage(account, start_date)
    local cmd = string.format(
        "sacct -a -A %s --starttime %s --format=CPUTimeRAW --noheader --parsable2 -X 2>/dev/null",
        account, start_date or "2024-01-01"
    )
    local handle = io.popen(cmd)
    if not handle then return 0 end

    local total_seconds = 0
    for line in handle:lines() do
        local secs = tonumber(line:match("^(%d+)"))
        if secs then total_seconds = total_seconds + secs end
    end
    handle:close()

    return total_seconds / 3600.0  -- core-hours (SUs)
end

-- Helper: estimate job cost
function estimate_job_cost(job_desc)
    local cpus = job_desc.min_cpus or 1
    local time_limit = job_desc.time_limit  -- in minutes
    if not time_limit or time_limit <= 0 then
        time_limit = 60  -- default 1 hour if unspecified
    end
    local hours = time_limit / 60.0
    return cpus * hours  -- core-hours
end

-- Helper: get current date as YYYY-MM-DD
function today()
    return os.date("%Y-%m-%d")
end

-- Helper: check if date is within range
function date_in_range(date_str, start_str, end_str)
    if not start_str or not end_str then return true end
    return date_str >= start_str and date_str <= end_str
end

--[[
    SLURM job_submit hook

    Called for every job submission (sbatch, salloc, srun).

    Return values:
      slurm.SUCCESS  — accept the job
      slurm.FAILURE  — reject the job (generic error)
      slurm.ERROR    — reject with custom error message

    job_desc fields:
      .account       — SLURM account
      .min_cpus      — requested CPUs
      .time_limit    — wall time in minutes
      .name          — job name
      .user_name     — submitting user (SLURM 23.02+)
      .partition     — requested partition
      .comment       — job comment field (we can annotate)
]]--

function slurm_job_submit(job_desc, submit_uid, part_list)
    local account = job_desc.account
    if not account or account == "" then
        -- No account specified — SLURM will use default, we can't enforce
        return slurm.SUCCESS
    end

    -- Read allocation config
    local content = read_allocations()
    if not content then
        return slurm.SUCCESS  -- Can't read config, allow job
    end

    -- Look for the "allocations" section
    local alloc_section = content:match('"allocations"%s*:%s*{(.-)}%s*[,}]')
    if not alloc_section then
        return slurm.SUCCESS  -- No allocations configured
    end

    -- Get this account's allocation
    local alloc = get_allocation(alloc_section, account)
    if not alloc then
        return slurm.SUCCESS  -- No prepaid allocation for this account
    end

    -- Check if allocation is active (within date range)
    local now = today()
    if not date_in_range(now, alloc.start_date, alloc.end_date) then
        return slurm.SUCCESS  -- Allocation not active
    end

    -- Get current usage
    local used_su = get_account_usage(account, alloc.start_date)
    local remaining_su = alloc.budget - used_su

    -- Estimate this job's cost
    local job_cost = estimate_job_cost(job_desc)

    -- Check if this job would exceed the budget
    local percent_after = ((used_su + job_cost) / alloc.budget) * 100

    if percent_after > alloc.alert_threshold and ENABLE_ENFORCEMENT then
        -- Reject the job
        slurm.log_info("%s: REJECTED job from account '%s' — "
            .. "would use %.0f/%.0f SU (%.1f%%), budget exceeded",
            LOG_PREFIX, account, used_su + job_cost, alloc.budget, percent_after)

        -- Set a user-visible error message
        slurm.log_user(string.format(
            "SlurmLedger: Job rejected — account '%s' has exceeded its allocation.\n"
            .. "  Budget: %.0f SU | Used: %.0f SU | Remaining: %.0f SU\n"
            .. "  This job would require ~%.0f SU.\n"
            .. "  Contact your PI or HPC admin to request additional allocation.",
            account, alloc.budget, used_su, remaining_su, job_cost
        ))

        return slurm.FAILURE
    end

    -- Warn if approaching limit (>80% after this job)
    if percent_after > 80 then
        slurm.log_info("%s: WARNING — account '%s' at %.1f%% after this job "
            .. "(%.0f/%.0f SU)", LOG_PREFIX, account, percent_after,
            used_su + job_cost, alloc.budget)

        -- Annotate the job comment so the user sees the warning
        local warning = string.format(
            "[SlurmLedger] Account '%s' at %.0f%% of allocation (%.0f/%.0f SU remaining after this job)",
            account, percent_after, alloc.budget - used_su - job_cost, alloc.budget
        )
        if job_desc.comment and job_desc.comment ~= "" then
            job_desc.comment = job_desc.comment .. " | " .. warning
        else
            job_desc.comment = warning
        end
    end

    -- Accept the job
    slurm.log_info("%s: ACCEPTED job from account '%s' — "
        .. "%.0f/%.0f SU (%.1f%% after this job)",
        LOG_PREFIX, account, used_su + job_cost, alloc.budget, percent_after)

    return slurm.SUCCESS
end

--[[
    SLURM job_modify hook (optional)

    Called when a job is modified (e.g., scontrol update).
    Can enforce limits on modifications too.
]]--
function slurm_job_modify(job_desc, job_rec, modify_uid, part_list)
    -- For now, allow all modifications
    -- Future: re-check allocation if time_limit or min_cpus changed
    return slurm.SUCCESS
end

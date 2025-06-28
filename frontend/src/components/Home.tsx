import { useEffect, useState } from 'react';
import { request } from '../api/client';
import { Link } from 'react-router-dom';

const Home = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    request('/slurm/jobs')
      .then((data) => setJobs(data.jobs))
      .catch(() => setJobs([]));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Jobs</h2>
      <ul>
        {jobs.map((job) => (
          <li key={job.id}>{job.id} - {job.state}</li>
        ))}
      </ul>
      <Link className="underline" to="/costs">Calculate Cost</Link>
    </div>
  );
};

export default Home;

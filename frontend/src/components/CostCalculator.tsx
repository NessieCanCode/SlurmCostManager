import { useState } from 'react';
import { request } from '../api/client';

const CostCalculator = () => {
  const [cpuHours, setCpuHours] = useState(0);
  const [memoryGBHours, setMemoryGBHours] = useState(0);
  const [cost, setCost] = useState<number | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await request('/costs/calculate', {
      method: 'POST',
      body: JSON.stringify({ cpuHours, memoryGBHours }),
    });
    setCost(data.cost);
  };

  return (
    <div>
      <form onSubmit={submit} className="space-y-2">
        <input
          type="number"
          className="border p-1"
          value={cpuHours}
          onChange={(e) => setCpuHours(Number(e.target.value))}
          placeholder="CPU Hours"
        />
        <input
          type="number"
          className="border p-1"
          value={memoryGBHours}
          onChange={(e) => setMemoryGBHours(Number(e.target.value))}
          placeholder="Memory GB Hours"
        />
        <button className="bg-green-500 text-white px-2 py-1" type="submit">
          Calculate
        </button>
      </form>
      {cost !== null && <p className="mt-2">Cost: {cost.toFixed(2)}</p>}
    </div>
  );
};

export default CostCalculator;

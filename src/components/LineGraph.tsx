import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Link {
  id: string;
  title: string;
  url: string;
}

interface LineGraphProps {
  links: Link[];
}

export function LineGraph({ links }: LineGraphProps) {
  // Create data for the line graph showing link distribution
  const data = links.map((link, index) => ({
    name: link.title,
    position: index + 1,
    value: Math.random() * 100, // Simulated value for demonstration
  }));

  return (
    <div className="line-graph-container">
      <h3>Link Distribution</h3>
      <div className="line-graph-wrapper">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
            <XAxis 
              dataKey="name" 
              stroke="#e5e7eb"
              tick={{ fill: '#e5e7eb' }}
              tickLine={{ stroke: '#404040' }}
            />
            <YAxis 
              stroke="#e5e7eb"
              tick={{ fill: '#e5e7eb' }}
              tickLine={{ stroke: '#404040' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1f1f1f',
                border: '1px solid #404040',
                color: '#e5e7eb'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#646cff" 
              strokeWidth={2}
              dot={{ fill: '#646cff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#646cff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 
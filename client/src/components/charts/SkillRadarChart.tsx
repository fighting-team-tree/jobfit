import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

interface SkillRadarChartProps {
  data: Array<{
    subject: string;
    A: number; // My Score
    B: number; // Required Score
    fullMark: number;
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-900 border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="font-semibold text-white mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-emerald-400">
            내 역량: <span className="font-bold">{payload[0].value}</span>
          </p>
          <p className="text-sm text-indigo-400">
            요구 역량: <span className="font-bold">{payload[1]?.value ?? 100}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function SkillRadarChart({ data }: SkillRadarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-neutral-500 bg-neutral-900/30 rounded-2xl border border-white/5">
        표시할 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full h-[350px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#404040" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#a3a3a3', fontSize: 12 }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
          />
          
          {/* 내 역량 (My Skills) */}
          <Radar
            name="내 역량"
            dataKey="A"
            stroke="#10b981" // Emerald-500
            strokeWidth={2}
            fill="#10b981"
            fillOpacity={0.4}
          />
          
          {/* 요구 역량 (Required) */}
          <Radar
            name="요구 역량"
            dataKey="B"
            stroke="#6366f1" // Indigo-500
            strokeWidth={2}
            fill="#6366f1"
            fillOpacity={0.1}
          />
          
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500"></div>
          <span className="text-neutral-300">내 역량</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500/40 border border-indigo-500"></div>
          <span className="text-neutral-300">요구 역량</span>
        </div>
      </div>
    </div>
  );
}

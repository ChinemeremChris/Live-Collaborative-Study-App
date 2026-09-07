import { Label, Legend, Pie, PieChart, Sector, Tooltip } from "recharts";
import { Fragment } from "react";
const CustomSector = (props) => {
    return <Sector {...props} fill={props.payload.color} />
}

const CustomLegend = ({ payload }) => {
    return (
        <div className="flex justify-center gap-4 flex-wrap">
            {
                payload.map((entry) => (
                    <div key={entry.value} className="flex items-center justify-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.payload.color }} />
                        <span>{entry.value}: {entry.payload.value}</span>
                    </div>
                ))
            }
        </div>
    )
}



export default function PieChartComponent({ chartData }) {
    return (
        <div className="flex flex-row items-center justify-center gap-2">
            <div className="relative w-48 h-48 md:w-100 md:h-70 lg:w-150 lg:h-100">
                <PieChart style={{ width: '100%', height: '100%' }} responsive>
                    <Pie data={chartData} nameKey="name" dataKey="value" cx="50%" cy="50%" innerRadius="50%" outerRadius="70%" shape={CustomSector} label={false} labelLine={false}></Pie>
                    <Tooltip />
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center">
                        <span className="text-3xl lg:text-6xl font-bold">
                            {chartData.reduce((sum, item) => sum + item.value, 0)}
                        </span>
                        <span className="text-sm lg:text-xl">
                            Cards
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                {
                    chartData.map((entry) => (
                        <div key={entry.name} className="flex md:w-40 items-center gap-1 font-semibold">
                            <div className="flex items-center gap-1 flex-1">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.name}</span>
                            </div>
                            <span className="w-8 text-right">{entry.value}</span>
                        </div>
                    ))
                }
            </div>
        </div>
        
    )
}
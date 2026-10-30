import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/surveys/${id}/results`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-6">Loading results and charts...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{data.title} - Results & Charts</h1>
      <p className="text-gray-600 mb-6">Total Responses: <strong>{data.totalResponses}</strong></p>

      {data.questions.map((q: any, index: number) => (
        <div key={q.id} className="bg-white p-4 shadow rounded mb-6 border">
          <h3 className="font-semibold text-lg mb-2">{index + 1}. {q.prompt}</h3>
          
          {/* Choice-based questions chart (SVY-F-014 / TC-Res-02) */}
          {q.counts && (
            <div>
              <div className="h-64 mb-4">
                <Bar
                  data={{
                    labels: q.counts.map((c: any) => c.label),
                    datasets: [{
                      label: 'Response Count',
                      data: q.counts.map((c: any) => c.count),
                      backgroundColor: 'rgba(54, 162, 235, 0.6)',
                      borderColor: 'rgba(54, 162, 235, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
              <ul className="text-sm text-gray-700 mt-2 border-t pt-2">
                {q.counts.map((c: any, i: number) => (
                  <li key={i}>{c.label}: <strong>{c.count}</strong> votes ({c.percent}%)</li>
                ))}
              </ul>
            </div>
          )}

          {/* Rating scale summary */}
          {q.average !== undefined && (
            <p className="text-lg">Average Rating: <strong>{q.average} / 5</strong> ({q.totalRatings} total ratings)</p>
          )}

          {/* Text responses list */}
          {q.textAnswers && (
            <ul className="list-disc pl-5 mt-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
              {q.textAnswers.map((ans: string, i: number) => (
                <li key={i} className="text-sm text-gray-800 py-1">{ans}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
import React, { useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useAnalysis } from '../context/AnalysisContext';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

const palette = ['#3f51b5', '#ff9800', '#4caf50', '#e53935', '#6a1b9a'];

const Analytics = () => {
  const { jobs, loading } = useAnalysis();

  const trendData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { day: date.toLocaleDateString(), key, completed: 0, failed: 0 };
    });
    const map = new Map(days.map((item) => [item.key, item]));
    jobs.forEach((job) => {
      const key = new Date(job.uploadedAt).toISOString().slice(0, 10);
      const bucket = map.get(key);
      if (!bucket) return;
      if (job.status === 'completed') bucket.completed += 1;
      if (job.status === 'failed') bucket.failed += 1;
    });
    return days;
  }, [jobs]);

  const successData = useMemo(() => {
    const completed = jobs.filter((job) => job.status === 'completed').length;
    const failed = jobs.filter((job) => job.status === 'failed').length;
    const processing = jobs.filter((job) => job.status === 'processing').length;
    return [
      { name: 'Completed', value: completed || 1 },
      { name: 'Failed', value: failed || 1 },
      { name: 'Processing', value: processing || 1 }
    ];
  }, [jobs]);

  const processingData = useMemo(() => {
    return jobs.map((job, index) => ({
      name: `Job ${index + 1}`,
      minutes: job.status === 'completed' ? 12 : Math.max(2, job.etaMinutes + 4)
    }));
  }, [jobs]);

  const fileTypeData = useMemo(() => {
    const map = jobs.reduce((acc, job) => {
      const key = job.fileType || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(map).map((key) => ({ name: key.toUpperCase(), value: map[key] }));
  }, [jobs]);

  const exportCsv = (rows, filename) => {
    const csv = rows.map((row) => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-subtitle">Performance insights and operational metrics</p>
        </div>
      </div>
      {loading ? (
        <div className="grid">
          <Skeleton height={260} />
          <Skeleton height={260} />
          <Skeleton height={260} />
          <Skeleton height={260} />
        </div>
      ) : (
        <div className="grid analytics-grid">
          <Card className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Trend Analysis</h2>
                <p className="panel-subtitle">Completed vs failed jobs over the last week</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportCsv(trendData, 'trend-analysis.csv')}>
                Export
              </Button>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" stroke="#3f51b5" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" stroke="#e53935" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Success Rate</h2>
                <p className="panel-subtitle">Current job status distribution</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportCsv(successData, 'success-rate.csv')}>
                Export
              </Button>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={successData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {successData.map((entry, index) => (
                      <Cell key={entry.name} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Processing Time</h2>
                <p className="panel-subtitle">Histogram of processing duration</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportCsv(processingData, 'processing-time.csv')}>
                Export
              </Button>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={processingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="minutes" fill="#4caf50" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">File Type Distribution</h2>
                <p className="panel-subtitle">Uploaded material file breakdown</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => exportCsv(fileTypeData, 'file-types.csv')}>
                Export
              </Button>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={fileTypeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={4}>
                    {fileTypeData.map((entry, index) => (
                      <Cell key={entry.name} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Analytics;

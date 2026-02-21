import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { useAnalysis } from '../context/AnalysisContext';

const statusTone = (status) => {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'processing') return 'warning';
  return 'info';
};

const History = () => {
  const { jobs, loading } = useAnalysis();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('uploadedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const pageSize = 6;

  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        const matchesSearch = [job.id, job.fileName, job.analysisType].some((value) =>
          value.toLowerCase().includes(search.toLowerCase())
        );
        const fromOk = fromDate ? new Date(job.uploadedAt) >= new Date(fromDate) : true;
        const toOk = toDate ? new Date(job.uploadedAt) <= new Date(toDate) : true;
        return matchesSearch && fromOk && toOk;
      })
      .sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        if (aValue === bValue) return 0;
        if (sortDir === 'asc') return aValue > bValue ? 1 : -1;
        return aValue < bValue ? 1 : -1;
      });
  }, [jobs, search, sortKey, sortDir, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const pagedJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>History</h1>
          <p className="page-subtitle">Search, filter, and review all analysis jobs</p>
        </div>
      </div>
      <Card className="panel">
        <div className="toolbar">
          <input
            className="text-input"
            type="text"
            placeholder="Search by job ID, file name, or analysis type"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search jobs"
          />
          <div className="toolbar-group">
            <label className="field">
              <span className="field-label">From</span>
              <input className="text-input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">To</span>
              <input className="text-input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
          </div>
          <div className="toolbar-group">
            <label className="field">
              <span className="field-label">Sort</span>
              <select className="text-input" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                <option value="uploadedAt">Upload Date</option>
                <option value="fileName">File Name</option>
                <option value="analysisType">Analysis Type</option>
                <option value="status">Status</option>
              </select>
            </label>
            <Button variant="ghost" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
              {sortDir === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="table-skeleton">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={40} />
            ))}
          </div>
        ) : (
          <div className="table-wrapper" role="region" aria-label="Job history table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Upload Date</th>
                  <th>File Name</th>
                  <th>Analysis Type</th>
                  <th>Status</th>
                  <th>Completion Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.id}</td>
                    <td>{new Date(job.uploadedAt).toLocaleString()}</td>
                    <td>{job.fileName}</td>
                    <td>{job.analysisType}</td>
                    <td>
                      <Badge label={job.status.toUpperCase()} tone={statusTone(job.status)} />
                    </td>
                    <td>{job.completedAt ? new Date(job.completedAt).toLocaleString() : 'In progress'}</td>
                    <td className="table-actions">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagedJobs.length === 0 && <p className="empty-state">No jobs match the current filters.</p>}
          </div>
        )}
        <div className="pagination">
          <Button variant="ghost" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="pagination-label">
            Page {page} of {totalPages}
          </span>
          <Button variant="ghost" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default History;

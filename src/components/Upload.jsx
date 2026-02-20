import React, { useMemo, useRef, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';
import ProgressBar from './ui/ProgressBar';
import Badge from './ui/Badge';
import { useAnalysis } from '../context/AnalysisContext';

const Upload = () => {
  const { uploadState, startUpload } = useAnalysis();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const onFilesSelected = (selectedFiles) => {
    const nextFiles = Array.from(selectedFiles || []);
    setFiles(nextFiles);
  };

  const supportedFormats = useMemo(() => ['PDF', 'CSV', 'XLSX', 'TXT', 'JSON'], []);

  return (
    <Card className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Upload Panel</h2>
          <p className="panel-subtitle">Drag and drop material files or browse to upload</p>
        </div>
        <Badge label={uploadState.status.toUpperCase()} tone={uploadState.status === 'error' ? 'error' : uploadState.status === 'success' ? 'success' : 'info'} />
      </div>
      <div
        className={`drop-zone ${dragActive ? 'drop-zone-active' : ''}`}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter') inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          onFilesSelected(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="file-input"
          onChange={(event) => onFilesSelected(event.target.files)}
          aria-label="Upload material files"
        />
        <div>
          <p className="drop-title">Drop files here</p>
          <p className="drop-subtitle">Supported formats: {supportedFormats.join(', ')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Browse Files
        </Button>
      </div>
      <div className="upload-actions">
        <Button
          variant="primary"
          onClick={() => startUpload(files[0])}
          disabled={uploadState.status === 'uploading' || files.length === 0}
        >
          Start Upload
        </Button>
        <Button variant="ghost" onClick={() => setFiles([])} disabled={files.length === 0}>
          Clear
        </Button>
      </div>
      <div className="upload-meta">
        <div>
          <p className="meta-label">Selected Files</p>
          {files.length === 0 ? <p className="meta-value">No files selected</p> : files.map((file) => <p key={file.name} className="meta-value">{file.name}</p>)}
        </div>
        <div>
          <p className="meta-label">Validation</p>
          <p className={`meta-value ${uploadState.status === 'error' ? 'text-error' : 'text-muted'}`}>
            {uploadState.error ? uploadState.error : 'Ready for upload'}
          </p>
        </div>
      </div>
      <div className="progress-section">
        <div className="progress-header">
          <p className="meta-label">Upload Progress</p>
          <p className="meta-value">{uploadState.progress}%</p>
        </div>
        <ProgressBar value={uploadState.progress} />
      </div>
    </Card>
  );
};

export default Upload;

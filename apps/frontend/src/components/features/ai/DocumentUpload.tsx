import { useState, useCallback } from 'react';
import { Upload, File, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useUploadDocument } from '@omarsapp/shared-api';
import { Button } from '../../ui/Button';

interface DocumentUploadProps {
  spaceId: string;
}

export function DocumentUpload({ spaceId }: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const uploadMutation = useUploadDocument(spaceId);

  const handleFile = useCallback((file: File) => {
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Drag & drop or click to upload</p>
        <p className="text-xs text-slate-400">PDF, Word, TXT — max 50MB</p>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          id="file-upload"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <label htmlFor="file-upload">
          <Button as="span" variant="secondary" size="sm" className="mt-4 cursor-pointer">
            Browse files
          </Button>
        </label>
      </div>
      {uploadMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Processing document...</span>
        </div>
      )}
      {uploadMutation.isSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>Document uploaded and queued for processing</span>
        </div>
      )}
      {uploadMutation.isError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="w-4 h-4" />
          <span>Upload failed. Please try again.</span>
        </div>
      )}
    </div>
  );
}

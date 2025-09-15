import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

interface FileUploadProps {
  onFileUploaded?: (url: string, fileName: string, fileType: string, fileObject?: File) => void;
  acceptedTypes?: string[];
  maxSizeInMB?: number;
  multiple?: boolean;
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadProgress: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  maxSizeInMB = 10,
  multiple = false,
  className = ''
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSizeInMB * 1024 * 1024) {
      toast.error(`파일 크기가 ${maxSizeInMB}MB를 초과했습니다.`);
      return false;
    }

    // Check file type
    const isTypeAccepted = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.name.toLowerCase().endsWith(type.toLowerCase()) || file.type === type;
    });

    if (!isTypeAccepted) {
      toast.error('지원하지 않는 파일 형식입니다.');
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from('knowledge-files')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('knowledge-files')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('파일 업로드에 실패했습니다.');
      return null;
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(validateFile);

    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const fileId = Math.random().toString(36).substr(2, 9);

        // Add file to state with initial progress
        setUploadedFiles(prev => [...prev, {
          id: fileId,
          name: file.name,
          url: '',
          type: file.type,
          size: file.size,
          uploadProgress: 0
        }]);

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileId
                ? { ...f, uploadProgress: Math.min(f.uploadProgress + 10, 90) }
                : f
            )
          );
        }, 200);

        try {
          const url = await uploadFile(file);

          clearInterval(progressInterval);

          if (url) {
            setUploadedFiles(prev =>
              prev.map(f =>
                f.id === fileId
                  ? { ...f, url, uploadProgress: 100 }
                  : f
              )
            );

            onFileUploaded?.(url, file.name, file.type, file);
            toast.success(`${file.name} 업로드 완료`);
          } else {
            // Remove failed upload
            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
          }
        } catch (error) {
          clearInterval(progressInterval);
          setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
          throw error;
        }
      });

      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <PhotoIcon className="h-6 w-6 text-blue-500" />;
    }
    return <DocumentIcon className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            파일을 여기에 드래그하거나
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mx-1 font-medium text-primary-600 hover:text-primary-500"
            >
              클릭하여 선택
            </button>
            하세요
          </p>
          <p className="text-xs text-gray-500 mt-1">
            최대 {maxSizeInMB}MB | {acceptedTypes.join(', ')}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
        />
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">업로드된 파일</h4>
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>

                  {/* Progress bar */}
                  {file.uploadProgress < 100 && (
                    <div className="mt-1">
                      <div className="bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-primary-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${file.uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {file.url && file.uploadProgress === 100 && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="파일 보기"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </a>
                )}

                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="파일 제거"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="text-center py-2">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-primary-500">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            업로드 중...
          </div>
        </div>
      )}
    </div>
  );
};
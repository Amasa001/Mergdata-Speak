import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Download, Info, FileArchive, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Project = Database['public']['Tables']['projects']['Row'];
type TaskType = Database['public']['Tables']['tasks']['Row']['type'];
type TaskPriority = Database['public']['Enums']['priority_level'];

// Expected CSV headers for different task types
const expectedHeaders: { [key in TaskType]?: string[] } = {
  translation: ['source_text'], 
  tts: ['text_to_speak'], 
  transcription: ['audio_url'] 
};

// Sample data for CSV templates
const sampleTemplates = {
  asr: [], // Indicates ASR supports bulk, but via ZIP, not CSV/Excel
  translation: [
    { source_text: "Hello, how are you?", task_title: "Greeting translation", task_description: "Translate this greeting to the target language", source_language: "English", target_language: "Akan", domain: "general" },
    { source_text: "Welcome to our community.", task_title: "Welcome message", task_description: "Translate this welcome message accurately", source_language: "English", target_language: "Ewe", domain: "general" },
    { source_text: "Please wash your hands regularly.", task_title: "Health instruction", task_description: "Translate this health advice clearly", source_language: "English", target_language: "Ga", domain: "health" }
  ],
  tts: [
    { text_to_speak: "The quick brown fox jumps over the lazy dog.", task_title: "Pronunciation practice", task_description: "Read this sentence clearly with correct pronunciation" },
    { text_to_speak: "Welcome to our language community. We are happy to have you here.", task_title: "Welcome message", task_description: "Record this welcome message with natural intonation" }
  ],
  transcription: [
    { audio_url: "https://example.com/audio1.mp3", task_title: "Short dialogue", task_description: "Transcribe this conversation accurately" },
    { audio_url: "https://example.com/audio2.mp3", task_title: "News clip", task_description: "Transcribe this news segment, marking unclear parts with [unclear]" }
  ],
};

// Interface for ASR upload status
interface AsrUploadStatus {
  totalFiles: number;
  processedFiles: number;
  errors: number;
  currentFile: string | null;
  statusMessage: string;
}

// Interface for Audio upload status (for transcription tasks)
interface AudioUploadStatus {
  totalFiles: number;
  processedFiles: number;
  errors: number;
  currentFile: string | null;
  statusMessage: string;
}

const ProjectTaskUpload: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState('');
  const [taskType, setTaskType] = useState<TaskType | ''>('');
  const [language, setLanguage] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [userId, setUserId] = useState<string | null>(null);
  const [asrUploadStatus, setAsrUploadStatus] = useState<AsrUploadStatus | null>(null);
  const [audioUploadStatus, setAudioUploadStatus] = useState<AudioUploadStatus | null>(null);
  const [transcriptionMode, setTranscriptionMode] = useState<'direct' | 'asr-pipeline'>('direct');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch project and user data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch user ID
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      
      if (!projectId) {
        toast.error('Project ID not provided.');
        navigate('/projects');
        return;
      }
      
      // Fetch project data
      try {
        const { data: projectData, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (error) throw error;
        
        setProject(projectData);
        
        // Pre-fill form fields based on project data
        if (projectData.type) {
          setTaskType(projectData.type);
        }
        
        if (projectData.target_languages && projectData.target_languages.length > 0) {
          setLanguage(projectData.target_languages[0]);
        }
        
        if (projectData.source_language) {
          setSourceLanguage(projectData.source_language);
        }
        
        setBatchName(projectData.name);
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project data.');
        navigate('/projects');
      } finally {
        setIsLoadingProject(false);
      }
    };
    
    fetchData();
  }, [projectId, navigate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      
      // Validate file type based on selected Task Type
      const isTextTask = taskType === 'translation' || taskType === 'tts';
      const isTranscriptionTask = taskType === 'transcription';
      const allowedTextTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const allowedZipMimeTypes = ['application/zip', 'application/x-zip-compressed']; // Accept common zip MIME types
      
      if (isTextTask && !allowedTextTypes.includes(selectedFile.type)) {
         toast.error(`Invalid file type for ${taskType}. Please upload a CSV or Excel file.`);
         setFile(null);
         if (fileInputRef.current) fileInputRef.current.value = '';
         return;
      } 
      else if (taskType === 'asr' && 
               !allowedZipMimeTypes.includes(selectedFile.type) && 
               !selectedFile.name.toLowerCase().endsWith('.zip')) 
      { 
         console.warn(`ASR Upload: Detected file type '${selectedFile.type}' for file '${selectedFile.name}'`);
         
         if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
             toast.error('Invalid file type for ASR bulk upload. Please upload a ZIP file.');
             setFile(null);
             if (fileInputRef.current) fileInputRef.current.value = '';
             return;
         }
      } 
      else if (isTranscriptionTask) {
        // Allow either CSV/Excel files or ZIP files for transcription tasks
        if (!allowedTextTypes.includes(selectedFile.type) && 
            !allowedZipMimeTypes.includes(selectedFile.type) && 
            !selectedFile.name.toLowerCase().endsWith('.zip')) {
          toast.error('Invalid file type for transcription task. Please upload a CSV/Excel file or a ZIP file containing audio recordings.');
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }
      
      setFile(selectedFile);
      setAsrUploadStatus(null); // Reset status when new file is selected
      setAudioUploadStatus(null); // Reset audio upload status
    } else {
      setFile(null);
      setAsrUploadStatus(null);
      setAudioUploadStatus(null);
    }
  };

  // Parse file (CSV/Excel)
  const parseFile = (fileToParse: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (fileToParse.type === 'text/csv') {
        // CSV Parsing using Papaparse
        Papa.parse(fileToParse, {
          header: true,
          skipEmptyLines: true,
          delimiter: '', 
          delimitersToGuess: [',', '\t', ';', '|'],
          transformHeader: (header) => {
            return header.replace(/^\uFEFF/, '').trim();
          },
          complete: (results) => {
            if (results.errors.length > 0) {
               console.error("CSV Parsing errors:", results.errors);
               const criticalErrors = results.errors.filter(e => 
                 e.code !== "TooFewFields" && e.code !== "TooManyFields" && 
                 e.code !== "UndetectableDelimiter"
               );
               
               if (criticalErrors.length > 0) {
                 reject(new Error(`CSV parsing failed: ${criticalErrors[0].message}`));
                 return;
               }
            }
            
            // Validate headers for the selected task type
            if (taskType && expectedHeaders[taskType]) {
                const requiredHeaders = expectedHeaders[taskType]!;
                const actualHeaders = results.meta.fields || [];
                const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));
                if (missingHeaders.length > 0) {
                    console.error("Headers found:", actualHeaders);
                    console.error("Missing required headers:", missingHeaders);
                    reject(new Error(`CSV is missing required headers for ${taskType} task: ${missingHeaders.join(', ')}. Headers found: ${actualHeaders.join(', ')}`));
                    return;
                }
            }

            console.log("CSV Parsed Data:", results.data);
            resolve(results.data);
          },
          error: (error) => {
            console.error("CSV Parsing error:", error);
            reject(new Error(`Error parsing CSV file: ${error.message}`));
          }
        });
      } else if (fileToParse.type === 'application/vnd.ms-excel' || 
                 fileToParse.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            if (!event.target?.result) {
              throw new Error('Failed to read Excel file: No data');
            }
            
            // Parse Excel data
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON with header: true
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
              throw new Error('Excel file must contain a header row and at least one data row');
            }
            
            // Extract headers from first row
            const headers = (jsonData[0] as string[]).map(h => h.trim());
            
            // Process the remaining rows using the extracted headers
            const processedData = jsonData.slice(1).map((row) => {
              const item: Record<string, any> = {};
              const rowData = row as Record<string, any>;
              
              // Map each Excel column to the appropriate header
              Object.keys(rowData).forEach((excelCol, index) => {
                if (index < headers.length) {
                  const header = headers[index];
                  item[header] = rowData[excelCol];
                }
              });
              
              return item;
            });
            
            // Validate headers for the selected task type
            if (taskType && expectedHeaders[taskType]) {
              const requiredHeaders = expectedHeaders[taskType]!;
              const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
              
              if (missingHeaders.length > 0) {
                console.error("Headers found:", headers);
                console.error("Missing required headers:", missingHeaders);
                reject(new Error(`Excel is missing required headers for ${taskType} task: ${missingHeaders.join(', ')}. Headers found: ${headers.join(', ')}`));
                return;
              }
            }
            
            console.log("Excel Parsed Data:", processedData);
            resolve(processedData);
            
          } catch (err: any) {
            console.error("Excel parsing error:", err);
            reject(new Error(`Error parsing Excel file: ${err.message}`));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read Excel file'));
        };
        
        reader.readAsBinaryString(fileToParse);
      }
      else {
        reject(new Error(`Unsupported file type for parsing: ${fileToParse.type}`));
      }
    });
  };

  // Process ASR ZIP files
  const processAsrZip = async (zipFile: File) => {
     if (!userId) {
         toast.error("User ID not found. Cannot process upload.");
         return;
     }
     setIsLoading(true);
     setAsrUploadStatus({
         totalFiles: 0,
         processedFiles: 0,
         errors: 0,
         currentFile: null,
         statusMessage: "Reading zip file..."
     });

     const zip = new JSZip();
     let imageFiles: { name: string; entry: JSZip.JSZipObject }[] = [];

     try {
         const content = await zip.loadAsync(zipFile);
         content.forEach((relativePath, zipEntry) => {
             // Check if it's an image file and not in a subdirectory structure
             if (!zipEntry.dir && /\.(jpg|jpeg|png|webp)$/i.test(zipEntry.name) && !relativePath.startsWith('__MACOSX/')) {
                 imageFiles.push({ name: zipEntry.name, entry: zipEntry });
             }
         });

         setAsrUploadStatus(prev => ({ ...prev!, totalFiles: imageFiles.length, statusMessage: `Found ${imageFiles.length} images. Starting uploads...` }));

         if (imageFiles.length === 0) {
             toast.error("No valid image files (.jpg, .jpeg, .png, .webp) found in the zip file.");
             setIsLoading(false);
             setAsrUploadStatus(null);
             return;
         }

         let successCount = 0;
         let errorCount = 0;

         for (let i = 0; i < imageFiles.length; i++) {
             const { name, entry } = imageFiles[i];

             setAsrUploadStatus(prev => ({ 
               ...prev!, 
               currentFile: name, 
               statusMessage: `Processing file ${i+1} of ${imageFiles.length}: ${name}` 
             }));

             try {
                 // Extract the image file from the zip
                 const blob = await entry.async('blob');

                 // Validate MIME type
                 if (!/image\/(jpeg|png|webp)/.test(blob.type) && !/image\/.*/.test(blob.type)) {
                     // Try to infer from extension if MIME is empty/wrong
                     const ext = name.split('.').pop()?.toLowerCase();
                     if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                         throw new Error(`File ${name} is not a supported image type`);
                     }
                     console.warn(`File ${name} has unrecognized MIME type ${blob.type}, but has valid extension .${ext}`);
                 }

                 // Upload image to storage
                 const timestamp = Date.now();
                 const folderPrefix = `project-${projectId}`;
                 const filePath = `task-images/asr/${folderPrefix}/${timestamp}-${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                 const { error: uploadError } = await supabase.storage
                     .from('contributions')
                     .upload(filePath, blob, { contentType: blob.type || 'image/jpeg' });

                 if (uploadError) {
                     throw new Error(`Storage upload error: ${uploadError.message}`);
                 }

                 // Get the public URL
                 const { data: urlData } = supabase.storage.from('contributions').getPublicUrl(filePath);
                 const publicUrl = urlData?.publicUrl;
                 if (!publicUrl) {
                     throw new Error("Failed to get public URL for uploaded image");
                 }

                 // Construct task payload with project_id
                 const taskPayload = {
                     created_by: userId,
                     type: 'asr' as TaskType,
                     language: language, 
                     priority: priority,
                     status: 'pending' as const,
                     project_id: parseInt(projectId!), // Associate with the project
                     content: {
                         task_title: `ASR Task: ${name}`,
                         task_description: 'Record a description for the provided image.',
                         image_url: publicUrl
                     }
                 };

                 // Insert task into database
                 const { error: insertError } = await supabase.from('tasks').insert(taskPayload);

                 if (insertError) {
                     throw new Error(`Database insert failed: ${insertError.message}`);
                 }

                 successCount++;
                 setAsrUploadStatus(prev => ({ ...prev!, processedFiles: successCount, errors: errorCount }));

             } catch (err) {
                 errorCount++;
                 setAsrUploadStatus(prev => ({ ...prev!, errors: errorCount }));
                 console.error(`Error processing file ${name}:`, err);
                 toast.error(`Failed to process ${name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
             }
         }

         setAsrUploadStatus(prev => ({ ...prev!, statusMessage: `Processing complete. ${successCount} tasks created, ${errorCount} errors.` }));
         toast.success(`Bulk ASR upload finished: ${successCount} tasks created.`);
         // Reset form after successful completion
         setFile(null);
         if (fileInputRef.current) fileInputRef.current.value = '';

     } catch (error: any) {
         console.error("Error processing ZIP file:", error);
         toast.error(`Failed to process ZIP file: ${error.message}`);
     } finally {
         setIsLoading(false);
     }
  };

  // Process Audio ZIP files for transcription tasks
  const processAudioZip = async (zipFile: File) => {
     if (!userId) {
         toast.error("User ID not found. Cannot process upload.");
         return;
     }
     setIsLoading(true);
     setAudioUploadStatus({
         totalFiles: 0,
         processedFiles: 0,
         errors: 0,
         currentFile: null,
         statusMessage: "Reading zip file..."
     });

     const zip = new JSZip();
     let audioFiles: { name: string; entry: JSZip.JSZipObject }[] = [];

     try {
         const content = await zip.loadAsync(zipFile);
         content.forEach((relativePath, zipEntry) => {
             // Check if it's an audio file and not in a subdirectory structure
             if (!zipEntry.dir && /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(zipEntry.name) && !relativePath.startsWith('__MACOSX/')) {
                 audioFiles.push({ name: zipEntry.name, entry: zipEntry });
             }
         });

         setAudioUploadStatus(prev => ({ ...prev!, totalFiles: audioFiles.length, statusMessage: `Found ${audioFiles.length} audio files. Starting uploads...` }));

         if (audioFiles.length === 0) {
             toast.error("No valid audio files (.mp3, .wav, .ogg, .m4a, .aac, .flac) found in the zip file.");
             setIsLoading(false);
             setAudioUploadStatus(null);
             return;
         }

         let successCount = 0;
         let errorCount = 0;

         for (let i = 0; i < audioFiles.length; i++) {
             const { name, entry } = audioFiles[i];

             setAudioUploadStatus(prev => ({ 
               ...prev!, 
               currentFile: name, 
               statusMessage: `Processing file ${i+1} of ${audioFiles.length}: ${name}` 
             }));

             try {
                 // Extract the audio file from the zip
                 const blob = await entry.async('blob');

                 // Set content type based on file extension
                 const ext = name.split('.').pop()?.toLowerCase();
                 let contentType = 'audio/mpeg'; // default
                 
                 if (ext === 'mp3') contentType = 'audio/mpeg';
                 else if (ext === 'wav') contentType = 'audio/wav';
                 else if (ext === 'ogg') contentType = 'audio/ogg';
                 else if (ext === 'm4a') contentType = 'audio/m4a';
                 else if (ext === 'aac') contentType = 'audio/aac';
                 else if (ext === 'flac') contentType = 'audio/flac';

                 // Upload audio to storage
                 const timestamp = Date.now();
                 const folderPrefix = `project-${projectId}`;
                 const filePath = `audio-files/transcription/${folderPrefix}/${timestamp}-${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                 const { error: uploadError } = await supabase.storage
                     .from('contributions')
                     .upload(filePath, blob, { contentType });

                 if (uploadError) {
                     throw new Error(`Storage upload error: ${uploadError.message}`);
                 }

                 // Get the public URL
                 const { data: urlData } = supabase.storage.from('contributions').getPublicUrl(filePath);
                 const publicUrl = urlData?.publicUrl;
                 if (!publicUrl) {
                     throw new Error("Failed to get public URL for uploaded audio");
                 }

                 // Create a title from the filename
                 const baseFileName = name.replace(/\.[^/.]+$/, ""); // Remove file extension
                 const formattedTitle = baseFileName
                   .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
                   .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize first letter of each word
                 
                 // Construct task payload with project_id
                 const taskPayload = {
                     created_by: userId,
                     type: 'transcription' as TaskType,
                     language: language, 
                     priority: priority,
                     status: 'pending' as const,
                     project_id: parseInt(projectId!), // Associate with the project
                     content: {
                         task_title: `Transcribe: ${formattedTitle}`,
                         task_description: 'Transcribe this audio recording accurately',
                         audio_url: publicUrl
                     }
                 };

                 // Insert task into database
                 const { error: insertError } = await supabase.from('tasks').insert(taskPayload);

                 if (insertError) {
                     throw new Error(`Database insert failed: ${insertError.message}`);
                 }

                 successCount++;
                 setAudioUploadStatus(prev => ({ ...prev!, processedFiles: successCount, errors: errorCount }));

             } catch (err) {
                 errorCount++;
                 setAudioUploadStatus(prev => ({ ...prev!, errors: errorCount }));
                 console.error(`Error processing file ${name}:`, err);
                 toast.error(`Failed to process ${name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
             }
         }

         setAudioUploadStatus(prev => ({ ...prev!, statusMessage: `Processing complete. ${successCount} tasks created, ${errorCount} errors.` }));
         toast.success(`Bulk audio upload finished: ${successCount} transcription tasks created.`);
         // Reset form after successful completion
         setFile(null);
         if (fileInputRef.current) fileInputRef.current.value = '';

     } catch (err) {
         console.error("Error processing zip file:", err);
         toast.error(`Failed to process zip file: ${err instanceof Error ? err.message : 'Unknown error'}`);
         setAudioUploadStatus(prev => ({ ...(prev ?? { totalFiles: 0, processedFiles: 0, errors: 0, currentFile: null, statusMessage: '' }), statusMessage: `Error: ${err instanceof Error ? err.message : 'Failed to read zip'}` }));
     } finally {
         setIsLoading(false);
     }
  };

  // Download a CSV template
  const downloadTemplate = () => {
    if (!taskType || taskType === 'asr' || taskType === 'transcription') {
      toast.error("Template not available for this task type");
      return;
    }
    
    const template = sampleTemplates[taskType];
    if (!template) {
      toast.error("No template available");
      return;
    }
    
    // Convert template to CSV
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${taskType}-tasks-template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error("You must be logged in to create tasks");
      return;
    }

    if (!projectId) {
      toast.error("Missing Project ID");
      return;
    }
    
    // Validation checks
    if (!taskType || !language || !file) {
      toast.error("Please select a task type, language, and upload a file");
      return;
    }

    // For translation tasks, validate source and target languages
    if (taskType === 'translation') {
      if (!sourceLanguage) {
        toast.error("Please select a source language for translation tasks");
        return;
      }
      
      if (sourceLanguage === language) {
        toast.error("Source and target languages cannot be the same");
        return;
      }
    }

    // If using transcription with ASR pipeline, change task type to ASR
    if (taskType === 'transcription' && transcriptionMode === 'asr-pipeline') {
      // Advise the user about the change
      toast.info("Creating ASR tasks for the transcription pipeline. Contributors will first record audio that will later be transcribed.");
      // Process as ASR task
      setTaskType('asr');
    }

    // Handle ZIP uploads for ASR tasks
    if (taskType === 'asr' && file.name.toLowerCase().endsWith('.zip')) {
      await processAsrZip(file);
      return;
    }

    // Handle ZIP uploads for Transcription tasks 
    if (taskType === 'transcription' && file.name.toLowerCase().endsWith('.zip')) {
      await processAudioZip(file);
      return;
    }
    
    // Continue with CSV/Excel processing for other task types
    setIsLoading(true);
    
    try {
      console.log(`Parsing file: ${file.name} (${file.type}) for task type: ${taskType}`);
      
      // 1. Parse File Content
      const parsedData = await parseFile(file);
      
      if (!parsedData || parsedData.length === 0) {
          throw new Error('No valid task data found in the uploaded file or file is empty.');
      }
      console.log(`Successfully parsed ${parsedData.length} rows.`);

      // 2. Map Parsed Data to Task Objects
      const tasksToInsert = parsedData.map((item, index) => {
         // Ensure item is an object
         if (typeof item !== 'object' || item === null) {
             console.warn(`Skipping invalid row ${index + 1}: Not an object`, item);
             return null; // Skip this row
         }
         
         // Construct the 'content' JSON based on taskType
         let taskContent: any = {
             task_title: item.task_title || `${batchName} - Item ${index + 1}`,
             task_description: item.task_description || `Task ${index + 1} from batch '${batchName}'.`,
         };
         
         if (taskType === 'translation') {
            // Translation-specific fields
            taskContent.source_text = item.source_text || '';
            taskContent.source_language = item.source_language || sourceLanguage;
            
            // Additional optional fields if present
            if (item.domain) taskContent.domain = item.domain;
            
            // Construct task object
            return {
                created_by: userId,
                type: 'translation',
                language: item.target_language || language,
                content: taskContent,
                status: 'pending',
                priority: item.priority || priority,
                project_id: parseInt(projectId) // Add project association
            };
         } 
         else if (taskType === 'tts') {
            // TTS-specific fields
            taskContent.text_to_speak = item.text_to_speak || '';
            
            // Construct task object
            return {
                created_by: userId,
                type: 'tts',
                language: item.language || language,
                content: taskContent,
                status: 'pending',
                priority: item.priority || priority,
                project_id: parseInt(projectId) // Add project association
            };
         }
         else if (taskType === 'transcription') {
            // Transcription-specific fields
            taskContent.audio_url = item.audio_url || '';
            
            // Construct task object
            return {
                created_by: userId,
                type: 'transcription',
                language: item.language || language,
                content: taskContent,
                status: 'pending',
                priority: item.priority || priority,
                project_id: parseInt(projectId) // Add project association
            };
         }
         else {
            console.warn(`Skipping row ${index + 1}: Unsupported task type ${taskType}`);
            return null;
         }
      }).filter(Boolean); // Remove nulls

      if (tasksToInsert.length === 0) {
           throw new Error('No valid tasks could be created from the file data. Check file content and headers.');
      }
      
      console.log(`Prepared ${tasksToInsert.length} valid tasks for insertion.`);

      // 3. Bulk Insert Tasks
      const BATCH_SIZE = 50;
      let totalInserted = 0;
      for (let i = 0; i < tasksToInsert.length; i += BATCH_SIZE) {
          const batch = tasksToInsert.slice(i, i + BATCH_SIZE);
          toast.info(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(tasksToInsert.length/BATCH_SIZE)} (${batch.length} tasks)...`);
          const { error } = await supabase.from('tasks').insert(batch as any);
          if (error) {
              console.error(`Error inserting batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
              throw new Error(`Failed to insert tasks into database: ${error.message}`);
          }
          totalInserted += batch.length;
      }

      toast.success(`Successfully created ${totalInserted} tasks for project "${project?.name}".`);
      // Reset form
      setFile(null);
      if (fileInputRef.current) {
         fileInputRef.current.value = '';
      }
      
      // Navigate back to project detail page
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 2000);

    } catch (error: any) {
      console.error('Bulk task creation failed:', error);
      toast.error(`Task upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTitle>Project not found</AlertTitle>
          <AlertDescription>
            The project you're trying to upload tasks to could not be found.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild>
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate(`/projects/${projectId}`)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Project
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Tasks to Project: {project.name}</CardTitle>
          <CardDescription>
            Upload a file (CSV, Excel, or ZIP for ASR) to create multiple tasks for this project at once.
            <span className="block mt-2 text-sm text-muted-foreground">
              Tip: Use the "Download Sample Template" button to get a correctly formatted template.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-muted/50 p-3 rounded-md mb-4">
              <h4 className="text-sm font-medium mb-2">Project Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Project Type:</span> {project.type}
                </div>
                <div>
                  <span className="font-medium">Source Language:</span> {project.source_language || 'Not specified'}
                </div>
                <div>
                  <span className="font-medium">Target Languages:</span> {project.target_languages?.join(', ') || 'Not specified'}
                </div>
              </div>
            </div>
          
            {/* Task Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="task-type">Task Type</Label>
                <Select 
                  value={taskType} 
                  onValueChange={value => {
                    setTaskType(value as TaskType);
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="translation">Translation</SelectItem>
                    <SelectItem value="transcription">Transcription</SelectItem>
                    <SelectItem value="tts">Text-to-Speech</SelectItem>
                    <SelectItem value="asr">Automatic Speech Recognition</SelectItem>
                  </SelectContent>
                </Select>
                {project.type && taskType !== project.type && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Note: Selected task type differs from the project type
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="language">Target Language</Label>
                <Input 
                  id="language" 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)} 
                  placeholder="e.g., Akan, Ewe, Ga"
                  required
                  disabled={isLoading}
                />
                {project.target_languages && project.target_languages.length > 0 && !project.target_languages.includes(language) && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Tip: This project has these target languages: {project.target_languages.join(', ')}
                  </p>
                )}
              </div>
            
              <div>
                <Label htmlFor="source-language">Source Language</Label>
                <Input 
                  id="source-language" 
                  value={sourceLanguage} 
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  placeholder="e.g., English" 
                  disabled={isLoading || taskType !== 'translation'}
                />
                {project.source_language && sourceLanguage !== project.source_language && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Note: Project source language is {project.source_language}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)} disabled={isLoading}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Transcription Mode Selector - only visible when transcription is selected */}
            {taskType === 'transcription' && (
              <div className="space-y-2">
                <Label htmlFor="transcriptionMode">Transcription Pipeline</Label>
                <Select 
                  value={transcriptionMode}
                  onValueChange={value => setTranscriptionMode(value as 'direct' | 'asr-pipeline')}
                >
                  <SelectTrigger id="transcriptionMode">
                    <SelectValue placeholder="Select transcription pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">
                      Direct Upload
                    </SelectItem>
                    <SelectItem value="asr-pipeline">
                      ASR Pipeline (Record → Validate → Transcribe)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {transcriptionMode === 'direct' 
                    ? 'Direct Upload: Upload audio files directly for transcription. Best for high-quality recordings and quick turnaround.' 
                    : 'ASR Pipeline: Create ASR tasks for recording, then validate before transcription. Best for quality control and when collecting new audio.'}
                </p>
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="taskFile">Upload File</Label>
                {taskType && taskType !== 'asr' && taskType !== 'transcription' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Sample Template
                  </Button>
                )}
                {taskType === 'transcription' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadTemplate}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV Template
                  </Button>
                )}
              </div>
              <Input 
                ref={fileInputRef}
                id="taskFile" 
                type="file" 
                onChange={handleFileChange} 
                accept={taskType === 'asr' ? '.zip,application/zip' : 
                       taskType === 'transcription' ? '.csv,.xlsx,.xls,.zip,application/zip' :
                       '.csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
                required 
                disabled={isLoading || !taskType}
              />
              <p className="text-xs text-muted-foreground">
                {taskType === 'translation' && 'CSV/Excel required. Must include column: source_text. Optional: task_title, task_description, source_language, target_language, domain.'}
                {taskType === 'tts' && 'CSV/Excel required. Must include column: text_to_speak. Optional: task_title, task_description.'}
                {taskType === 'transcription' && transcriptionMode === 'direct' && 'Upload a CSV/Excel file with audio_url column OR a ZIP file containing audio files (.mp3, .wav, .ogg, etc.)'}
                {taskType === 'transcription' && transcriptionMode === 'asr-pipeline' && 'Upload a CSV/Excel file with text prompts for ASR recording tasks.'}
                {taskType === 'asr' && 'Upload a ZIP file containing images (.jpg, .jpeg, .png, or .webp)'}
                {!taskType && 'Select a task type to see file requirements.'}
              </p>
            </div>

            {/* ASR Upload Progress */}
            {isLoading && taskType === 'asr' && asrUploadStatus && (
              <div className="space-y-2 pt-4">
                <Label>Upload Progress</Label>
                <Progress value={asrUploadStatus.totalFiles > 0 ? (asrUploadStatus.processedFiles / asrUploadStatus.totalFiles) * 100 : 0} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {asrUploadStatus.statusMessage} 
                  ({asrUploadStatus.processedFiles} / {asrUploadStatus.totalFiles} processed, {asrUploadStatus.errors} errors)
                </p>
              </div>
            )}

            {/* Audio Upload Progress for Transcription */}
            {audioUploadStatus && (
              <div className="border rounded-md p-4 bg-muted">
                <h4 className="text-sm font-medium mb-2">Audio Upload Progress</h4>
                <div className="space-y-2">
                  <Progress value={(audioUploadStatus.processedFiles / audioUploadStatus.totalFiles) * 100} />
                  <p className="text-sm">{audioUploadStatus.statusMessage}</p>
                  <p className="text-sm">
                    {audioUploadStatus.processedFiles} of {audioUploadStatus.totalFiles} processed 
                    {audioUploadStatus.errors > 0 ? ` (${audioUploadStatus.errors} errors)` : ''}
                  </p>
                  {audioUploadStatus.currentFile && (
                    <p className="text-xs text-muted-foreground truncate">
                      Current file: {audioUploadStatus.currentFile}
                    </p>
                  )}
                </div>
              </div>
            )}
          
            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate(`/projects/${projectId}`)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !file || !taskType}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading Tasks...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Upload Tasks</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectTaskUpload; 
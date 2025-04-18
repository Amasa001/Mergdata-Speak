import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Download, Info, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx'; // Import xlsx library
import JSZip from 'jszip'; // Added JSZip import
import { Progress } from '@/components/ui/progress'; // Added Progress import

type TaskType = Database['public']['Tables']['tasks']['Row']['type'];
type TaskPriority = Database['public']['Tables']['tasks']['Row']['priority'];

// TODO: Define available languages more robustly if needed
const availableLanguages = [
  "Akan", "Ewe", "Ga", "Dagbani", "Fante", "Dagaare", "Gonja", "Kasem", "Kusaal", "Nzema", "English" 
];

// Expected CSV headers for different task types
const expectedHeaders: { [key in TaskType]?: string[] } = {
  translation: ['source_text'], // Example: CSV must have at least a 'source_text' column
  tts: ['text_to_speak'], // Example: CSV must have 'text_to_speak'
  transcription: ['audio_url'] // Example: CSV must have 'audio_url' pointing to existing audio
  // Add headers for other types if they support bulk upload via CSV/Excel
};

// Updated to include ASR
const availableTaskTypes: TaskType[] = ['asr', 'tts', 'translation', 'transcription'];

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
    { audio_url: "https://example.com/audio1.mp3", task_title: "Market conversation", task_description: "Transcribe this market conversation accurately" },
    { audio_url: "https://example.com/audio2.mp3", task_title: "Radio broadcast", task_description: "Transcribe this news broadcast accurately" }
  ]
};

// Added state for ASR bulk upload progress/status
interface ASRUploadStatus {
    totalFiles: number;
    processedFiles: number;
    errors: number;
    currentFile: string | null;
    statusMessage: string;
}

export const BulkTaskCreator: React.FC = () => {
  const [batchName, setBatchName] = useState('');
  const [taskType, setTaskType] = useState<TaskType | ''>('');
  const [language, setLanguage] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for ASR bulk upload progress
  const [asrUploadStatus, setAsrUploadStatus] = useState<ASRUploadStatus | null>(null);

  // Fetch current user ID when component mounts
  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        toast.error("You must be logged in to create tasks");
      }
    };
    
    fetchUserId();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      
      // Validate file type based on selected Task Type
      const isTextTask = taskType === 'translation' || taskType === 'tts' || taskType === 'transcription';
      const allowedTextTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const allowedAsrMimeTypes = ['application/zip', 'application/x-zip-compressed']; // Accept common zip MIME types
      
      if (isTextTask && !allowedTextTypes.includes(selectedFile.type)) {
         toast.error(`Invalid file type for ${taskType}. Please upload a CSV or Excel file.`);
         setFile(null);
         if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
         return;
      } 
      // For ASR, check MIME type OR file extension
      else if (taskType === 'asr' && 
               !allowedAsrMimeTypes.includes(selectedFile.type) && 
               !selectedFile.name.toLowerCase().endsWith('.zip')) 
      { 
         // Log the detected type for debugging
         console.warn(`ASR Upload: Detected file type '${selectedFile.type}' for file '${selectedFile.name}'. Allowing based on extension check if applicable.`);
         
         // Check extension again explicitly for the error message
         if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
             toast.error('Invalid file type for ASR bulk upload. Please upload a ZIP file (.zip extension).');
             setFile(null);
             if (fileInputRef.current) fileInputRef.current.value = '';
             return;
         }
         // If it has .zip extension but wrong MIME, we still allow it here
      } 
      
      setFile(selectedFile);
      setAsrUploadStatus(null); // Reset status when new file is selected
    } else {
      setFile(null);
      setAsrUploadStatus(null);
    }
  };

  // --- File Parsing Logic ---
  const parseFile = (fileToParse: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (fileToParse.type === 'text/csv') {
        // --- CSV Parsing using Papaparse ---
        Papa.parse(fileToParse, {
          header: true, // Expect headers
          skipEmptyLines: true,
          delimiter: '', // Auto-detect delimiter (try various options)
          delimitersToGuess: [',', '\t', ';', '|'], // Common delimiters to try
          transformHeader: (header) => {
            // Remove BOM characters if present and trim whitespace
            return header.replace(/^\uFEFF/, '').trim();
          },
          complete: (results) => {
            if (results.errors.length > 0) {
               console.error("CSV Parsing errors:", results.errors);
               // Only reject if errors are critical
               const criticalErrors = results.errors.filter(e => 
                 e.code !== "TooFewFields" && e.code !== "TooManyFields" && 
                 e.code !== "UndetectableDelimiter"
               );
               
               if (criticalErrors.length > 0) {
                 reject(new Error(`CSV parsing failed: ${criticalErrors[0].message}`));
                 return;
               }
               
               // Continue with warnings for minor issues
               console.warn("Non-critical CSV parsing warnings detected. Continuing with available data.");
            }
            
            // Validate headers for the selected task type
            if (taskType && expectedHeaders[taskType]) {
                const requiredHeaders = expectedHeaders[taskType]!;
                const actualHeaders = results.meta.fields || [];
                const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));
                if (missingHeaders.length > 0) {
                    // Show sample headers found to aid troubleshooting
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
      } 
      // --- Excel Parsing using SheetJS (xlsx) --- 
      else if (['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(fileToParse.type)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (!event.target || !event.target.result) {
              throw new Error("Failed to read Excel file");
            }
            
            // Parse the Excel file
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            // Get the first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with headers
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
            
            // Extract headers (first row) and convert data to expected format
            if (jsonData.length === 0) {
              reject(new Error("Excel file is empty"));
              return;
            }
            
            // Extract headers from the first row
            const headerRow = jsonData[0] as Record<string, string>;
            const headers: string[] = [];
            
            // Convert Excel-style headers (A, B, C) to actual column names
            Object.keys(headerRow).forEach(key => {
              headers.push(headerRow[key].toString().trim());
            });
            
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
      // --- TODO: Handle ASR file uploads (e.g., ZIP containing images) --- 
      // else if (taskType === 'asr') {
      //   // Handle image uploads (maybe from a zip file?)
      //   // This would likely involve uploading the files to storage first 
      //   // and then creating tasks referencing the URLs.
      //   reject(new Error('ASR bulk upload via file is not yet implemented.'));
      // }
      else {
        reject(new Error(`Unsupported file type for parsing: ${fileToParse.type}`));
      }
    });
  };

  // --- Handle ASR Zip upload separately --- 
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
             // Check if it's an image file and not in a subdirectory structure like __MACOSX
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
             const currentFileNumber = i + 1;
             setAsrUploadStatus(prev => ({ ...prev!, currentFile: name, statusMessage: `Processing file ${currentFileNumber} of ${prev!.totalFiles}: ${name}` }));

             try {
                 const imageBlob = await entry.async('blob');
                 const uniqueFileName = `asr-task-images/${userId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

                 // Upload to Supabase Storage (bucket 'asr-task-images')
                 const { error: uploadError } = await supabase.storage
                     .from('asr-task-images') // *** IMPORTANT: Ensure this bucket exists! ***
                     .upload(uniqueFileName, imageBlob, {
                         cacheControl: '3600',
                         upsert: false
                     });

                 if (uploadError) {
                     throw new Error(`Storage upload failed: ${uploadError.message}`);
                 }

                 // Get public URL
                 const { data: urlData } = supabase.storage.from('asr-task-images').getPublicUrl(uniqueFileName);
                 const publicUrl = urlData?.publicUrl;

                 if (!publicUrl) {
                     throw new Error("Could not get public URL for uploaded image.");
                 }

                 // Construct task payload
                 const taskPayload = {
                     created_by: userId,
                     type: 'asr' as TaskType,
                     language: language, // From batch settings
                     priority: priority, // From batch settings
                     status: 'pending' as const,
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
                 // Optionally: Try to clean up - e.g., delete uploaded storage file if DB insert failed?
             }
         }

         setAsrUploadStatus(prev => ({ ...prev!, statusMessage: `Processing complete. ${successCount} tasks created, ${errorCount} errors.` }));
         toast.success(`Bulk ASR upload finished: ${successCount} tasks created.`);
         // Reset form after successful completion
         setFile(null);
         setBatchName('');
         setSourceLanguage('English');
         // setLanguage(''); // Keep language/priority maybe?
         if (fileInputRef.current) fileInputRef.current.value = '';

     } catch (err) {
         console.error("Error processing zip file:", err);
         toast.error(`Failed to process zip file: ${err instanceof Error ? err.message : 'Unknown error'}`);
         setAsrUploadStatus(prev => ({ ...(prev ?? { totalFiles: 0, processedFiles: 0, errors: 0, currentFile: null, statusMessage: '' }), statusMessage: `Error: ${err instanceof Error ? err.message : 'Failed to read zip'}` }));
     } finally {
         setIsLoading(false);
     }
 };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!userId) {
      toast.error('You must be logged in to create tasks');
      return;
    }
    
    // Consolidated validation checks
    if (!batchName || !taskType || !language || !file) {
      toast.error('Please fill in Batch Name, Task Type, Language, and select a file.');
      return;
    }

    // For translation tasks, ensure both source and target languages are selected
    if (taskType === 'translation' && (!sourceLanguage || !language)) {
      toast.error('Please select both source and target languages for translation tasks.');
      return;
    }

    // For translation tasks, ensure source and target languages are different
    if (taskType === 'translation' && sourceLanguage === language) {
      toast.error('Source and target languages cannot be the same for translation tasks.');
      return;
    }

    // --- Handle ASR Zip upload separately --- 
    if (taskType === 'asr') {
      // Check if file has .zip extension
      if (file.name.toLowerCase().endsWith('.zip')) {
          await processAsrZip(file);
      } else {
          toast.error("Incorrect file type for ASR bulk upload. Please upload a ZIP.");
      }
      return; // Stop execution here for ASR tasks
    }
    
    // --- Existing logic for CSV/Excel uploads for other task types ---
    setIsLoading(true);
    setAsrUploadStatus(null); // Clear ASR status if switching to other types
    toast.info(`Starting bulk task creation for ${taskType.toUpperCase()}...`);

    try {
      // Add more informative logging
      console.log(`Parsing file: ${file.name} (${file.type}) for task type: ${taskType}`);
      
      // 1. Parse File Content (Only for non-ASR types now)
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
         
         // Populate content based on task type and EXPECTED headers
         if (taskType === 'translation') {
             if (!item.source_text) {
                 console.warn(`Skipping row ${index + 1} (Translation): Missing required 'source_text' column.`);
                 return null;
             }
             taskContent.source_text = item.source_text;
             taskContent.source_language = item.source_language || sourceLanguage;
             taskContent.target_language = item.target_language || language;
             taskContent.domain = item.domain || 'general';
         } else if (taskType === 'tts') {
             if (!item.text_to_speak) {
                 console.warn(`Skipping row ${index + 1} (TTS): Missing required 'text_to_speak' column.`);
                 return null;
             }
             taskContent.text_to_speak = item.text_to_speak;
         } else if (taskType === 'transcription') {
             if (!item.audio_url) {
                 console.warn(`Skipping row ${index + 1} (Transcription): Missing required 'audio_url' column.`);
                 return null;
             }
             taskContent.audio_url = item.audio_url;
         }

         // Add batch name to content JSON
         taskContent.batch_name = batchName;

         // Determine which language to use for the database field
         // For translation tasks, use the target language as the primary language field
         const dbLanguage = taskType === 'translation' 
             ? (item.target_language || language) 
             : language;

         return {
             type: taskType,
             language: dbLanguage,
             priority: priority,
             status: 'pending' as const,
             content: taskContent,
             created_by: userId,
         };
      }).filter(task => task !== null);
      
      if (tasksToInsert.length === 0) {
           throw new Error('No valid tasks could be created from the file data. Check file content and headers.');
      }
      
      console.log(`Prepared ${tasksToInsert.length} valid tasks for insertion.`);

      // 3. Bulk Insert Tasks (remains the same)
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

      toast.success(`Successfully created ${totalInserted} tasks in batch '${batchName}'.`);
      // Reset form
      setBatchName('');
      setTaskType('');
      setLanguage('');
      setSourceLanguage('English');
      setPriority('medium');
      setFile(null);
      if (fileInputRef.current) {
         fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Bulk task creation failed (CSV/Excel):', error);
      toast.error(`Bulk task creation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to generate and download a sample CSV template
  const downloadSampleTemplate = () => {
    if (!taskType) {
      toast.error("Please select a task type first");
      return;
    }

    const samples = sampleTemplates[taskType as keyof typeof sampleTemplates];
    if (!samples) {
      toast.error("No sample template available for this task type");
      return;
    }

    // Convert sample data to CSV
    let csv = '';
    
    // Get all unique headers
    const headers = Object.keys(samples[0]);
    csv += headers.join(',') + '\n';
    
    // Add data rows
    samples.forEach(row => {
      const rowData = headers.map(header => {
        const value = row[header as keyof typeof row] || '';
        // Escape quotes and wrap in quotes if contains comma
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csv += rowData.join(',') + '\n';
    });
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${taskType}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloaded sample ${taskType} template`);
  };

  // Handle change in task type
  const handleTaskTypeChange = (value: string) => {
    setTaskType(value as TaskType);
    // Reset language fields when changing task types
    setLanguage('');
    if (value === 'translation') {
      setSourceLanguage('English');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Task Creation</CardTitle>
        <CardDescription>
          Upload a file (CSV or Excel) to create multiple tasks at once. 
          Ensure the file headers match the requirements for the selected task type.
          <span className="block mt-2 text-sm text-muted-foreground">
            Tip: Select a task type and use the "Download Sample Template" button to get a correctly formatted template.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Add a helper information section */}
          {taskType && (
            <div className="bg-muted/50 p-3 rounded-md mb-4">
              <h4 className="text-sm font-medium mb-2">Format Requirements for {taskType.toUpperCase()} Tasks</h4>
              <div className="text-xs space-y-1">
                {taskType === 'translation' && (
                  <>
                    <p><strong>Required column:</strong> source_text (the text to be translated)</p>
                    <p><strong>Optional columns:</strong> task_title, task_description, source_language, target_language, domain</p>
                    <p><strong>Example row:</strong> "Hello, how are you?","Greeting translation","Translate this greeting to the target language","English","Akan","general"</p>
                    <p><strong>Note:</strong> If source_language or target_language are not specified in the CSV, the selected values from the form will be used.</p>
                  </>
                )}
                {taskType === 'tts' && (
                  <>
                    <p><strong>Required column:</strong> text_to_speak (the text that needs to be spoken)</p>
                    <p><strong>Optional columns:</strong> task_title, task_description</p>
                    <p><strong>Example row:</strong> "The quick brown fox jumps over the lazy dog.","Pronunciation practice","Read with correct pronunciation"</p>
                  </>
                )}
                {taskType === 'transcription' && (
                  <>
                    <p><strong>Required column:</strong> audio_url (the URL to the audio that needs transcription)</p>
                    <p><strong>Optional columns:</strong> task_title, task_description</p>
                    <p><strong>Example row:</strong> "https://example.com/audio1.mp3","Market conversation","Transcribe this market conversation accurately"</p>
                  </>
                )}
                <p className="mt-2 italic">Note: For CSV files, ensure values with commas or quotes are properly escaped with double quotes.</p>
              </div>
            </div>
          )}
          
          {/* Batch Name */}
          <div>
            <Label htmlFor="batchName">Batch Name</Label>
            <Input 
              id="batchName" 
              value={batchName} 
              onChange={(e) => setBatchName(e.target.value)} 
              placeholder="e.g., Q3 Akan Translation Batch 1" 
              required 
              disabled={isLoading}
            />
          </div>

          {/* Task Type, Language, Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="bulk-taskType">Task Type</Label>
                 <Select name="taskType" value={taskType} onValueChange={handleTaskTypeChange} required disabled={isLoading}>
                    <SelectTrigger id="bulk-taskType">
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Map over availableTaskTypes to generate items dynamically */}
                      {availableTaskTypes.map(type => (
                        <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
                {taskType && taskType !== 'asr' && ( // Hide template download for ASR
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleTemplate}
                    className="mt-2 text-xs"
                  >
                    <Download className="mr-1 h-3 w-3" /> Download Sample Template
                  </Button>
                )}
            </div>
            
            {/* Conditionally show source language dropdown for translation tasks */}
            {taskType === 'translation' && (
              <div>
                <Label htmlFor="bulk-source-language">Source Language</Label>
                <Select name="sourceLanguage" value={sourceLanguage} onValueChange={setSourceLanguage} required disabled={isLoading}>
                  <SelectTrigger id="bulk-source-language">
                    <SelectValue placeholder="Select source language" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
                <Label htmlFor="bulk-language">{taskType === 'translation' ? 'Target Language' : 'Language'}</Label>
                 <Select name="language" value={language} onValueChange={setLanguage} required disabled={isLoading}>
                    <SelectTrigger id="bulk-language">
                      <SelectValue placeholder={taskType === 'translation' ? 'Select target language' : 'Select language'} />
                    </SelectTrigger>
                    <SelectContent>
                       {taskType === 'translation' 
                        ? availableLanguages.filter(l => l !== sourceLanguage).map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)
                        : availableLanguages.filter(l => l !== 'English').map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <Label htmlFor="bulk-priority">Priority</Label>
                <Select name="priority" value={priority} onValueChange={(value) => setPriority(value as TaskPriority)} required disabled={isLoading}>
                    <SelectTrigger id="bulk-priority">
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

          {/* File Upload */}
          <div>
             <Label htmlFor="taskFile">Upload File</Label>
             <div className="flex items-center space-x-2">
               <Input 
                 ref={fileInputRef}
                 id="taskFile" 
                 type="file" 
                 onChange={handleFileChange} 
                 accept={taskType === 'asr' ? '.zip,application/zip' : '.csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
                 required 
                 disabled={isLoading || !taskType}
                 className="flex-grow"
               />
                {/* Optionally show file name */}
               {file && <span className="text-sm text-muted-foreground truncate max-w-xs">{file.name}</span>}
             </div>
             <p className="text-xs text-muted-foreground mt-1">
               {taskType === 'translation' && 'CSV/Excel required. Must include column: source_text. Optional: task_title, task_description, source_language, target_language, domain.'}
               {taskType === 'tts' && 'CSV/Excel required. Must include column: text_to_speak. Optional: task_title, task_description.'}
               {taskType === 'transcription' && 'CSV/Excel required. Must include column: audio_url. Optional: task_title, task_description.'}
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

          {/* Submit Button */}
          <Button type="submit" disabled={isLoading || !file}>
            {isLoading ? (
               <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Tasks...</>
            ) : (
                <>
                 <Upload className="mr-2 h-4 w-4" /> Create Bulk Tasks
                </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}; 
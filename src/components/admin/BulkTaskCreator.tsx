import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, Download, Info, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/integrations/supabase/types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Progress } from '@/components/ui/progress';

type TaskType = Database['public']['Tables']['tasks']['Row']['type'];
type TaskPriority = Database['public']['Tables']['tasks']['Row']['priority'];

const availableLanguages = [
  "Akan", "Ewe", "Ga", "Dagbani", "Fante", "Dagaare", "Gonja", "Kasem", "Kusaal", "Nzema", "English" 
];

const expectedHeaders: { [key in TaskType]?: string[] } = {
  translation: ['source_text'], 
  tts: ['text_to_speak'], 
  transcription: ['audio_url']
};

const availableTaskTypes: TaskType[] = ['asr', 'tts', 'translation', 'transcription'];

const sampleTemplates = {
  asr: [],
  translation: [
    { source_text: "Hello, how are you?", task_title: "Greeting translation", task_description: "Translate this greeting to the target language", source_language: "English", domain: "general" },
    { source_text: "Welcome to our community.", task_title: "Welcome message", task_description: "Translate this welcome message accurately", source_language: "English", domain: "general" },
    { source_text: "Please wash your hands regularly.", task_title: "Health instruction", task_description: "Translate this health advice clearly", source_language: "English", domain: "health" }
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
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [asrUploadStatus, setAsrUploadStatus] = useState<ASRUploadStatus | null>(null);

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
      
      const isTextTask = taskType === 'translation' || taskType === 'tts' || taskType === 'transcription';
      const allowedTextTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const allowedAsrMimeTypes = ['application/zip', 'application/x-zip-compressed'];

      if (isTextTask && !allowedTextTypes.includes(selectedFile.type)) {
         toast.error(`Invalid file type for ${taskType}. Please upload a CSV or Excel file.`);
         setFile(null);
         if (fileInputRef.current) fileInputRef.current.value = '';
         return;
      } 
      else if (taskType === 'asr' && 
               !allowedAsrMimeTypes.includes(selectedFile.type) && 
               !selectedFile.name.toLowerCase().endsWith('.zip')) 
      { 
         console.warn(`ASR Upload: Detected file type '${selectedFile.type}' for file '${selectedFile.name}'. Allowing based on extension check if applicable.`);
         
         if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
             toast.error('Invalid file type for ASR bulk upload. Please upload a ZIP file (.zip extension).');
             setFile(null);
             if (fileInputRef.current) fileInputRef.current.value = '';
             return;
         }
      } 
      
      setFile(selectedFile);
      setAsrUploadStatus(null);
    } else {
      setFile(null);
      setAsrUploadStatus(null);
    }
  };

  const parseFile = (fileToParse: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (fileToParse.type === 'text/csv') {
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
               
               console.warn("Non-critical CSV parsing warnings detected. Continuing with available data.");
            }
            
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
      } 
      else if (['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(fileToParse.type)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            if (!event.target || !event.target.result) {
              throw new Error("Failed to read Excel file");
            }
            
            const data = event.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
            
            if (jsonData.length === 0) {
              reject(new Error("Excel file is empty"));
              return;
            }
            
            const headerRow = jsonData[0] as Record<string, string>;
            const headers: string[] = [];
            
            Object.keys(headerRow).forEach(key => {
              headers.push(headerRow[key].toString().trim());
            });
            
            const processedData = jsonData.slice(1).map((row) => {
              const item: Record<string, any> = {};
              const rowData = row as Record<string, any>;
              
              Object.keys(rowData).forEach((excelCol, index) => {
                if (index < headers.length) {
                  const header = headers[index];
                  item[header] = rowData[excelCol];
                }
              });
              
              return item;
            });
            
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

                 const { error: uploadError } = await supabase.storage
                     .from('asr-task-images')
                     .upload(uniqueFileName, imageBlob, {
                         cacheControl: '3600',
                         upsert: false
                     });

                 if (uploadError) {
                     throw new Error(`Storage upload failed: ${uploadError.message}`);
                 }

                 const { data: urlData } = supabase.storage.from('asr-task-images').getPublicUrl(uniqueFileName);
                 const publicUrl = urlData?.publicUrl;

                 if (!publicUrl) {
                     throw new Error("Could not get public URL for uploaded image.");
                 }

                 const taskPayload = {
                     created_by: userId,
                     type: 'asr' as TaskType,
                     language: language,
                     priority: priority,
                     status: 'pending' as const,
                     content: {
                         task_title: `ASR Task: ${name}`,
                         task_description: 'Record a description for the provided image.',
                         image_url: publicUrl
                     }
                 };

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
         setFile(null);
         setBatchName('');
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
    
    if (!batchName || !taskType || !language || !file) {
      toast.error('Please fill in Batch Name, Task Type, Language, and select a file.');
      return;
    }

    if (taskType === 'asr') {
      if (file.name.toLowerCase().endsWith('.zip')) {
          await processAsrZip(file);
      } else {
          toast.error("Incorrect file type for ASR bulk upload. Please upload a ZIP.");
      }
      return;
    }
    
    setIsLoading(true);
    setAsrUploadStatus(null);
    toast.info(`Starting bulk task creation for ${taskType.toUpperCase()}...`);

    try {
      console.log(`Parsing file: ${file.name} (${file.type}) for task type: ${taskType}`);
      
      const parsedData = await parseFile(file);
      
      if (!parsedData || parsedData.length === 0) {
          throw new Error('No valid task data found in the uploaded file or file is empty.');
      }
      console.log(`Successfully parsed ${parsedData.length} rows.`);

      const tasksToInsert = parsedData.map((item, index) => {
         if (typeof item !== 'object' || item === null) {
             console.warn(`Skipping invalid row ${index + 1}: Not an object`, item);
             return null;
         }
         
         let taskContent: any = {
             task_title: item.task_title || `${batchName} - Item ${index + 1}`,
             task_description: item.task_description || `Task ${index + 1} from batch '${batchName}'.`,
         };
         
         if (taskType === 'translation') {
             if (!item.source_text) {
                 console.warn(`Skipping row ${index + 1} (Translation): Missing required 'source_text' column.`);
                 return null;
             }
             taskContent.source_text = item.source_text;
             taskContent.source_language = item.source_language || 'English';
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

         taskContent.batch_name = batchName;
         
         if (taskType === 'translation') {
             taskContent.source_language = item.source_language || 'English';
             taskContent.target_language = language;
         }

         return {
             type: taskType,
             language: taskType === 'translation' ? (item.source_language || 'English') : language,
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
      setBatchName('');
      setTaskType('');
      setLanguage('');
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

    let csv = '';
    
    const headers = Object.keys(samples[0]);
    csv += headers.join(',') + '\n';
    
    samples.forEach(row => {
      const rowData = headers.map(header => {
        const value = row[header as keyof typeof row] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csv += rowData.join(',') + '\n';
    });
    
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
          {taskType && (
            <div className="bg-muted/50 p-3 rounded-md mb-4">
              <h4 className="text-sm font-medium mb-2">Format Requirements for {taskType.toUpperCase()} Tasks</h4>
              <div className="text-xs space-y-1">
                {taskType === 'translation' && (
                  <>
                    <p><strong>Required column:</strong> source_text (the text to be translated)</p>
                    <p><strong>Optional columns:</strong> task_title, task_description, source_language, domain</p>
                    <p><strong>Example row:</strong> "Hello, how are you?","Greeting translation","Translate this greeting to the target language","English","general"</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="bulk-taskType">Task Type</Label>
                 <Select name="taskType" value={taskType} onValueChange={(value) => setTaskType(value as TaskType)} required disabled={isLoading}>
                    <SelectTrigger id="bulk-taskType">
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTaskTypes.map(type => (
                        <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
                {taskType && taskType !== 'asr' && (
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
            <div>
                <Label htmlFor="bulk-language">Language</Label>
                 <Select name="language" value={language} onValueChange={setLanguage} required disabled={isLoading}>
                    <SelectTrigger id="bulk-language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                       {availableLanguages.filter(l => l !== 'English').map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
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
               {file && <span className="text-sm text-muted-foreground truncate max-w-xs">{file.name}</span>}
             </div>
             <p className="text-xs text-muted-foreground mt-1">
               {taskType === 'translation' && 'CSV/Excel required. Must include column: source_text. Optional: task_title, task_description, source_language.'}
               {taskType === 'tts' && 'CSV/Excel required. Must include column: text_to_speak. Optional: task_title, task_description.'}
               {taskType === 'transcription' && 'CSV/Excel required. Must include column: audio_url. Optional: task_title, task_description.'}
               {taskType === 'asr' && 'Upload a ZIP file containing images (.jpg, .jpeg, .png, or .webp)'}
               {!taskType && 'Select a task type to see file requirements.'}
             </p>
          </div>

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

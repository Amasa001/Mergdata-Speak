import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Headphones, FileText, Languages, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// Component for validation task
const ValidateTask: React.FC = () => {
  const navigate = useNavigate();
  const [contributions, setContributions] = useState<Tables['contributions'][]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  
  // Fetch unique languages from contributions
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('language')
          .distinct('language');

        if (tasksError) throw tasksError;

        // Map and filter unique languages, ensuring they are strings
        const uniqueLanguages = Array.from(
          new Set(
            tasksData
              .map(task => task.language)
              .filter((lang): lang is string => typeof lang === 'string')
          )
        );

        setLanguages(uniqueLanguages);
      } catch (error) {
        console.error('Error fetching languages:', error);
      }
    };

    fetchLanguages();
  }, []);

  // Fetch contributions that need validation
  useEffect(() => {
    const fetchContributions = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('contributions')
          .select(`
            *,
            tasks:task_id(id, type, language, content),
            profiles:user_id(full_name)
          `)
          .eq('status', 'pending_validation');
        
        // Apply language filter if not 'all'
        if (selectedLanguage !== 'all') {
          query = query.eq('tasks.language', selectedLanguage);
        }
        
        // Apply type filter if not 'all'
        if (selectedType !== 'all') {
          query = query.eq('tasks.type', selectedType);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setContributions(data || []);
        setCurrentIndex(0); // Reset to first contribution when filters change
      } catch (error) {
        console.error('Error fetching contributions:', error);
        toast.error('Failed to load contributions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchContributions();
  }, [selectedLanguage, selectedType]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
  };
  
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
  };
  
  const handleNextContribution = () => {
    if (currentIndex < contributions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // Reset form state
      setFeedback('');
      setDecision(null);
    } else {
      toast.success('All contributions validated!');
      navigate('/dashboard');
    }
  };
  
  const handleSubmitValidation = async () => {
    if (!decision) {
      toast.error('Please select approve or reject');
      return;
    }
    
    const currentContribution = contributions[currentIndex];
    if (!currentContribution) return;
    
    setSubmitting(true);
    
    try {
      // 1. Insert validation record
      const { error: validationError } = await supabase
        .from('validations')
        .insert({
          contribution_id: currentContribution.id,
          validator_id: (await supabase.auth.getUser()).data.user?.id,
          is_approved: decision === 'approve',
          comment: feedback
        });
      
      if (validationError) throw validationError;
      
      // 2. Update contribution status
      const newStatus = decision === 'approve' ? 'validated' : 'rejected';
      const { error: updateError } = await supabase
        .from('contributions')
        .update({ status: newStatus })
        .eq('id', currentContribution.id);
      
      if (updateError) throw updateError;
      
      toast.success(`Contribution ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);
      
      // Move to next contribution
      handleNextContribution();
    } catch (error) {
      console.error('Error submitting validation:', error);
      toast.error('Failed to submit validation');
    } finally {
      setSubmitting(false);
    }
  };
  
  const getCurrentContribution = () => {
    return contributions[currentIndex];
  };
  
  const currentContribution = getCurrentContribution();
  
  // Render content based on task type
  const renderContributionContent = () => {
    if (!currentContribution || !currentContribution.tasks) {
      return <div>No content available</div>;
    }
    
    const taskType = currentContribution.tasks.type;
    const content = currentContribution.submitted_data;
    
    switch(taskType) {
      case 'asr':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Original Image Prompt:</h4>
              {currentContribution.tasks.content.imageUrl && (
                <img 
                  src={currentContribution.tasks.content.imageUrl as string} 
                  alt="ASR prompt" 
                  className="max-h-64 object-contain mx-auto mb-4"
                />
              )}
              <p className="text-sm text-gray-700">{currentContribution.tasks.content.description as string}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Submitted Audio:</h4>
              {currentContribution.storage_url ? (
                <audio 
                  src={currentContribution.storage_url} 
                  controls 
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-gray-500">No audio available</p>
              )}
            </div>
          </div>
        );
        
      case 'tts':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Original Text Prompt:</h4>
              <p className="text-sm text-gray-700">{currentContribution.tasks.content.text as string}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Submitted Audio:</h4>
              {currentContribution.storage_url ? (
                <audio 
                  src={currentContribution.storage_url} 
                  controls 
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-gray-500">No audio available</p>
              )}
            </div>
          </div>
        );
        
      case 'transcription':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Original Audio:</h4>
              {currentContribution.tasks.content.audioUrl ? (
                <audio 
                  src={currentContribution.tasks.content.audioUrl as string} 
                  controls 
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-gray-500">No audio available</p>
              )}
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Submitted Transcription:</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{content.transcription as string}</p>
            </div>
          </div>
        );
        
      case 'translation':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Original Text:</h4>
              <p className="text-sm text-gray-700">{currentContribution.tasks.content.sourceText as string}</p>
              <p className="text-xs text-gray-500 mt-1">Source Language: {currentContribution.tasks.content.sourceLanguage as string}</p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Submitted Translation:</h4>
              <p className="text-sm text-gray-700">{content.translation as string}</p>
              <p className="text-xs text-gray-500 mt-1">Target Language: {currentContribution.tasks.language}</p>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown task type</div>;
    }
  };
  
  const getTaskTypeIcon = (type: string) => {
    switch(type) {
      case 'asr':
        return <CheckCircle className="h-5 w-5 text-afri-orange" />;
      case 'tts':
        return <Headphones className="h-5 w-5 text-afri-blue" />;
      case 'transcription':
        return <FileText className="h-5 w-5 text-afri-green" />;
      case 'translation':
        return <Languages className="h-5 w-5 text-afri-purple" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold">Validation Tasks</h1>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter contributions by language and type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Language</h3>
                <Tabs 
                  value={selectedLanguage} 
                  onValueChange={handleLanguageChange}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    {languages.slice(0, 2).map(lang => (
                      <TabsTrigger key={lang} value={lang}>{lang}</TabsTrigger>
                    ))}
                  </TabsList>
                  {languages.length > 2 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {languages.slice(2).map(lang => (
                        <Button 
                          key={lang}
                          variant={selectedLanguage === lang ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleLanguageChange(lang)}
                          className="text-xs"
                        >
                          {lang}
                        </Button>
                      ))}
                    </div>
                  )}
                </Tabs>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Task Type</h3>
                <Tabs 
                  value={selectedType} 
                  onValueChange={handleTypeChange}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="asr">ASR</TabsTrigger>
                    <TabsTrigger value="tts">TTS</TabsTrigger>
                    <TabsTrigger value="transcription">Transcription</TabsTrigger>
                    <TabsTrigger value="translation">Translation</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading contributions...</p>
          </div>
        )}
        
        {/* No Contributions State */}
        {!loading && contributions.length === 0 && (
          <Card className="border-dashed border-gray-300 shadow-none">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Contributions to Validate</h3>
                <p className="text-gray-500 mb-4">
                  There are no pending contributions matching your current filters.
                </p>
                {(selectedLanguage !== 'all' || selectedType !== 'all') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedLanguage('all');
                      setSelectedType('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Validation Interface */}
        {!loading && contributions.length > 0 && currentContribution && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gray-100 rounded-full">
                    {getTaskTypeIcon(currentContribution.tasks?.type || '')}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {currentContribution.tasks?.type.charAt(0).toUpperCase() + currentContribution.tasks?.type.slice(1)} Validation
                    </CardTitle>
                    <CardDescription>
                      Contribution by {currentContribution.profiles?.full_name || 'Anonymous'} in {currentContribution.tasks?.language}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {currentIndex + 1} of {contributions.length}
                </div>
              </div>
              <Progress value={(currentIndex / contributions.length) * 100} className="mt-2 h-2" />
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Contribution Content */}
                {renderContributionContent()}
                
                {/* Validation Form */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-medium">Validation Decision</h3>
                  
                  <RadioGroup value={decision || ''} onValueChange={(value) => setDecision(value as 'approve' | 'reject')}>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="approve" id="approve" />
                        <Label htmlFor="approve" className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> Approve
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reject" id="reject" />
                        <Label htmlFor="reject" className="flex items-center">
                          <XCircle className="h-4 w-4 text-red-500 mr-1" /> Reject
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                  
                  <div>
                    <Label htmlFor="feedback">Feedback (optional)</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Enter feedback for the contributor..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={handleNextContribution}
                      disabled={submitting || currentIndex >= contributions.length - 1}
                    >
                      Skip
                    </Button>
                    
                    <Button
                      onClick={handleSubmitValidation}
                      disabled={submitting || !decision}
                      className={decision === 'approve' ? "bg-green-600 hover:bg-green-700" : decision === 'reject' ? "bg-red-600 hover:bg-red-700" : ""}
                    >
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                      ) : (
                        <>Submit Validation</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ValidateTask;

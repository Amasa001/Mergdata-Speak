import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectionReasonDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reasons: { value: string; label: string }[];
  onSubmit: (reason: string, otherText?: string) => void;
}

export const RejectionReasonDialog: React.FC<RejectionReasonDialogProps> = ({
  isOpen,
  onOpenChange,
  reasons,
  onSubmit,
}) => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const [otherText, setOtherText] = useState<string>("");

  const handleSubmit = () => {
    if (!selectedValue) return; // Should not happen if button is enabled
    
    if (selectedValue === 'OTHER') {
      onSubmit(selectedValue, otherText);
    } else {
      onSubmit(selectedValue);
    }
    resetState();
  };

  const handleCancel = () => {
    resetState();
    onOpenChange(false);
  };
  
  const resetState = () => {
      setSelectedValue(undefined);
      setOtherText("");
  }

  const isSubmitDisabled = !selectedValue || (selectedValue === 'OTHER' && otherText.trim() === '');

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reason for Rejection</AlertDialogTitle>
          <AlertDialogDescription>
            Please select the primary reason why this contribution is being rejected.
            This feedback helps contributors improve.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <RadioGroup value={selectedValue} onValueChange={setSelectedValue} className="space-y-2 py-4">
          {reasons.map((reason) => (
            <div key={reason.value} className="flex items-center space-x-2">
              <RadioGroupItem value={reason.value} id={`reason-${reason.value}`} />
              <Label htmlFor={`reason-${reason.value}`}>{reason.label}</Label>
            </div>
          ))}
          {/* Add standard OTHER option */}
          <div key="OTHER" className="flex items-center space-x-2">
            <RadioGroupItem value="OTHER" id="reason-OTHER" />
            <Label htmlFor="reason-OTHER">Other</Label>
          </div>
        </RadioGroup>

        {selectedValue === 'OTHER' && (
          <Textarea
            placeholder="Please specify the reason..."
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            className="mt-2"
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isSubmitDisabled}>
            Confirm Rejection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 
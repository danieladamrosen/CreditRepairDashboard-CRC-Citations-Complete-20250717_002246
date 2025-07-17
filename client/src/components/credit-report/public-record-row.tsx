import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, AlertTriangle, Check, Zap, Lightbulb } from 'lucide-react';
import { ThickCheckIcon } from '@/components/ui/thick-check-icon';
import { NotReportedByBureauCard } from '@/components/ui/not-reported-by-bureau-card';

interface PublicRecordRowProps {
  record: any;
  recordIndex?: number;
  onDispute: (recordId: string, dispute: any) => void;
  onDisputeSaved?: (recordId: string) => void;
  onDisputeReset?: (recordId: string) => void;
  onHeaderReset?: () => void;
  expandAll?: boolean;
  aiScanCompleted?: boolean;
  aiViolations?: string[];
  aiSuggestions?: string[];
  savedDisputes?: { [key: string]: any };
}

export function PublicRecordRow({
  record,
  recordIndex = 0,
  onDispute,
  onDisputeSaved,
  onDisputeReset,
  onHeaderReset,
  expandAll,
  aiScanCompleted,
  aiViolations = [],
  aiSuggestions = [],
  savedDisputes = {}
}: PublicRecordRowProps) {
  // Generate consistent record ID matching the section - MUST be first
  const recordId = record['@CreditLiabilityID'] || record['@_SubscriberCode'] || `record_${record.index || recordIndex}`;
  
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedInstruction, setSelectedInstruction] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [showCustomReasonField, setShowCustomReasonField] = useState(false);
  const [showCustomInstructionField, setShowCustomInstructionField] = useState(false);
  // Initialize saved state from parent
  const [isDisputeSaved, setIsDisputeSaved] = useState(!!savedDisputes[recordId]);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [transUnionStatus, setTransUnionStatus] = useState('');
  const [equifaxStatus, setEquifaxStatus] = useState('');
  const [experianStatus, setExperianStatus] = useState('');
  const [isChoreographyActive, setIsChoreographyActive] = useState(false);
  const [showViolations, setShowViolations] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showViolationSources, setShowViolationSources] = useState(false);
  const [showSuggestionSources, setShowSuggestionSources] = useState(false);
  const [isTypingReason, setIsTypingReason] = useState(false);
  const [isTypingInstruction, setIsTypingInstruction] = useState(false);

  // Typing animation function
  const typeText = async (
    text: string,
    setter: (value: string) => void,
    isTypingSetter: (value: boolean) => void,
    speed: number = 30
  ) => {
    isTypingSetter(true);
    setter('');

    for (let i = 0; i <= text.length; i++) {
      setter(text.slice(0, i));
      await new Promise((resolve) => setTimeout(resolve, speed));
    }

    isTypingSetter(false);
  };

  // Sync with expandAll prop (but NOT during choreography)
  useEffect(() => {
    if (expandAll !== undefined && !isChoreographyActive) {
      console.log(`🔍 PUBLIC RECORDS: expandAll prop changed to ${expandAll}, setting isCollapsed to ${!expandAll}`);
      setIsCollapsed(!expandAll);
      setShowAccountDetails(expandAll);
    } else if (expandAll !== undefined && isChoreographyActive) {
      console.log(`🔍 PUBLIC RECORDS: Ignoring expandAll=${expandAll} because choreography is active`);
    }
  }, [expandAll, isChoreographyActive]);

  // Sync saved state with parent and restore dispute values
  useEffect(() => {
    const isSaved = !!savedDisputes[recordId];
    
    // Only update saved state if not during choreography (prevent state conflicts)
    if (!isChoreographyActive) {
      setIsDisputeSaved(isSaved);
      // If saved, keep it collapsed
      if (isSaved) {
        console.log(`🔍 PUBLIC RECORDS: Auto-collapsing because saved=${isSaved} and choreographyActive=${isChoreographyActive}`);
        setIsCollapsed(true);
      }
    } else {
      console.log(`🔍 PUBLIC RECORDS: Skipping all state sync because choreography is active`);
    }

    // Restore saved dispute values if they exist
    if (isSaved && savedDisputes[recordId] && typeof savedDisputes[recordId] === 'object') {
      const savedData = savedDisputes[recordId] as { reason?: string; instruction?: string };
      if (savedData.reason && savedData.instruction) {
        // Only restore if user hasn't made manual selections
        const hasUserSelections = selectedReason || selectedInstruction || showCustomReasonField || showCustomInstructionField;
        
        if (!hasUserSelections) {
          // Get dropdown options for comparison - using actual dropdown values
          const disputeReasons = [
            'I have never been associated with this record',
            'This record has incorrect information',
            'This record is too old to report',
            'This record has been resolved or satisfied',
            'I was not properly notified of this action',
            'This violates my consumer rights',
            'Identity theft - this is not my record'
          ];

          const disputeInstructions = [
            'Remove this record from my credit report immediately',
            'Update this record with correct information',
            'Verify the accuracy of this record',
            'Please investigate this record thoroughly',
            'Correct the reporting of this record',
            'Delete this inaccurate record',
            'Update this record to reflect proper status'
          ];

          // Check if saved values match dropdown options
          if (disputeReasons.includes(savedData.reason)) {
            setSelectedReason(savedData.reason);
            setShowCustomReasonField(false);
          } else {
            setCustomReason(savedData.reason);
            setShowCustomReasonField(true);
            setSelectedReason('');
          }

          if (disputeInstructions.includes(savedData.instruction)) {
            setSelectedInstruction(savedData.instruction);
            setShowCustomInstructionField(false);
          } else {
            setCustomInstruction(savedData.instruction);
            setShowCustomInstructionField(true);
            setSelectedInstruction('');
          }
        }
      }
    }
  }, [savedDisputes, recordId, isChoreographyActive]);

  // Get formatted data for display
  const getFormattedRecordData = () => {
    const recordType = record['@publicRecordType'] || record.publicRecordType || 'Public Record';
    const courthouse = record['@courtName'] || record.courtName || 'U.S. Bankruptcy Court for the Northern District of Illinois';
    const filingDate = record['@filingDate'] || record.filingDate || '2019-03-15';
    const amount = record['@amount'] || record.amount || 'N/A';
    const status = record['@status'] || record.status || 'Discharged';
    const referenceNumber = record['@referenceNumber'] || record.referenceNumber || 'N/A';

    return {
      recordType: recordType.charAt(0).toUpperCase() + recordType.slice(1),
      courthouse,
      filingDate,
      amount: amount !== 'N/A' ? `$${amount}` : 'N/A',
      status: status.charAt(0).toUpperCase() + status.slice(1),
      referenceNumber
    };
  };

  const recordData = getFormattedRecordData();

  // Status options for the dropdowns
  const statusOptions = [
    'Positive',
    'Negative',
    'Repaired',
    'Deleted',
    'In Dispute',
    'Verified',
    'Updated',
    'Unspecified',
    'Ignore',
  ];

  // Format date to MM/DD/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Unknown') return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US');
    } catch {
      return dateString;
    }
  };

  // Format currency with commas
  const formatCurrency = (amount: string | number) => {
    if (!amount || amount === '0') return '$0';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '$0';
    return '$' + numAmount.toLocaleString('en-US');
  };

  // Add line break for very long court names only
  const formatCourtName = (courtName: string) => {
    if (!courtName || courtName.length <= 50) return courtName;
    
    // Break after "the" for better readability
    if (courtName.includes(' for the ') && courtName.length > 55) {
      const parts = courtName.split(' for the ');
      if (parts.length === 2 && parts[0].length > 20 && parts[1].length > 15) {
        return parts[0] + ' for the\n' + parts[1];
      }
    }
    
    return courtName;
  };

  // Get first field data helper function
  const getFirstFieldData = () => {
    const courtName = record['@courtName'] || record.courtName || 'U.S. Bankruptcy Court for the Northern District of Illinois';
    return {
      label: record['@publicRecordType']?.toLowerCase().includes('bankruptcy') ? 'Court' : 'Court Name',
      value: courtName
    };
  };

  // Check if record has negative keywords
  const hasNegativeKeywords = () => {
    const recordType = (record['@publicRecordType'] || record.publicRecordType || '').toLowerCase();
    const negativeKeywords = ['bankruptcy', 'lien', 'judgment', 'foreclosure', 'garnishment', 'civil'];
    return negativeKeywords.some(keyword => recordType.includes(keyword));
  };

  const hasAnyNegative = hasNegativeKeywords();

  // Compute button disabled state
  const hasReason = showCustomReasonField ? customReason.trim() : selectedReason;
  const hasInstruction = showCustomInstructionField ? customInstruction.trim() : selectedInstruction;
  const isButtonDisabled = !hasReason || !hasInstruction;

  // Handle save dispute function
  // Helper function to execute the actual save logic
  const executeSaveLogic = async () => {
    if (isButtonDisabled) {
      // Show red glow on incomplete fields
      const elements = document.querySelectorAll('.border-gray-300, .border-green-500, .border-red-500');
      elements.forEach(el => {
        if (el.closest('.space-y-2')) {
          el.classList.add('ring-4', 'ring-red-400', 'ring-opacity-75');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-red-400', 'ring-opacity-75');
          }, 2000);
        }
      });
      return;
    }

    // Get final values
    const finalReason = showCustomReasonField ? customReason.trim() : selectedReason;
    const finalInstruction = showCustomInstructionField ? customInstruction.trim() : selectedInstruction;
    
    // Create dispute data
    const disputeData = {
      recordId: recordId,
      reason: finalReason,
      instruction: finalInstruction,
      timestamp: new Date().toISOString()
    };

    // Call the dispute handler
    onDispute(recordId, disputeData);

    // Call saved handler if provided
    if (onDisputeSaved) {
      onDisputeSaved(recordId);
    }

    // Step 1: Set choreography flag to prevent ALL external state changes
    setIsChoreographyActive(true);
    console.log(`🟢 PUBLIC RECORDS: Choreography flag set to TRUE - blocking all external state changes`);
    
    // Step 2: Ensure expanded state before showing green (critical for visibility)
    setIsCollapsed(false);
    console.log(`🟢 PUBLIC RECORDS: Forced expanded state for green visibility`);
    
    // Step 3: Mark as saved (this turns the card green)
    const startTime = performance.now();
    console.log(`🟢 PUBLIC RECORDS: setIsDisputeSaved(true) at ${startTime}ms`);
    setIsDisputeSaved(true);
    
    // Step 4: Double requestAnimationFrame to ensure green state is fully rendered and visible
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
    
    const renderTime = performance.now();
    console.log(`🟢 PUBLIC RECORDS: Green state rendered at ${renderTime}ms (${renderTime - startTime}ms after setState)`);
    
    // Step 5: Critical 300ms pause - NO OTHER LOGIC DURING THIS TIME
    console.log(`🟢 PUBLIC RECORDS: Starting 300ms pause at ${renderTime}ms`);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const pauseEndTime = performance.now();
    console.log(`🟢 PUBLIC RECORDS: 300ms pause completed at ${pauseEndTime}ms (${pauseEndTime - renderTime}ms pause duration)`);
    
    // Step 6: Collapse the record ONLY after 300ms pause completes
    console.log(`🟢 PUBLIC RECORDS: setIsCollapsed(true) at ${pauseEndTime}ms`);
    setIsCollapsed(true);
    
    // Step 5: Wait for collapse animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Step 6: Auto-scroll AFTER collapse completes (moved to end to avoid interference)
    const currentCard = document.querySelector(`[data-record-id="${recordId}"]`);
    if (currentCard) {
      const rect = currentCard.getBoundingClientRect();
      const scrollTop = window.pageYOffset + rect.top - 20;
      window.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
    
    // Step 7: Clear choreography flag
    setIsChoreographyActive(false);
  };

  const handleSaveDispute = async () => {
    console.log("Save button clicked — triggering choreography regardless of isDisputeSaved");
    
    // If already saved, trigger re-save choreography by calling the full save function
    if (isDisputeSaved) {
      console.log('GREEN SAVE BUTTON CLICKED - Triggering re-save choreography');
      
      // Reset and trigger full choreography again
      setIsDisputeSaved(false);
      setTimeout(() => {
        // Call the actual save logic to trigger choreography
        executeSaveLogic().catch(error => {
          console.error("Error in re-save choreography:", error);
        });
      }, 50);
      return;
    }
    
    // Call the main save logic
    try {
      await executeSaveLogic();
    } catch (error) {
      console.error("Error in executeSaveLogic:", error);
    }
  };

  const disputeReasons = [
    'I have never been associated with this record',
    'This record has incorrect information',
    'This record is too old to report',
    'This record has been resolved or satisfied',
    'I was not properly notified of this action',
    'This violates my consumer rights',
    'Identity theft - this is not my record'
  ];

  const disputeInstructions = [
    'Remove this record from my credit report immediately',
    'Update this record with correct information',
    'Verify the accuracy of this record',
    'Please investigate this record thoroughly',
    'Correct the reporting of this record',
    'Delete this inaccurate record',
    'Update this record to reflect proper status'
  ];

  // Show collapsed saved state when saved and collapsed
  if (isDisputeSaved && isCollapsed) {
    return (
      <Card 
        className="border-[2px] border-green-500 bg-green-50 transition-all duration-300 hover:shadow-lg rounded-lg overflow-hidden cursor-pointer"
        data-record-id={recordId}
        onClick={() => setIsCollapsed(false)}
      >
        <CardHeader className="cursor-pointer flex flex-row items-center justify-between p-6 bg-green-50 hover:bg-green-100 transition-colors duration-200 hover:shadow-lg rounded-t-lg min-h-[72px]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center">
              <ThickCheckIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {recordData.recordType}
              </h3>
              <p className="text-sm text-green-600 font-normal">Dispute Saved</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">Record</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card 
      className={`transition-all duration-300 ${
        isCollapsed ? 'border border-gray-200' : 'border-2 border-gray-300'
      } hover:shadow-lg rounded-lg overflow-hidden`}
      data-record-id={recordId}
    >
      <CardContent className={hasAnyNegative ? "p-0" : "p-6"}>
        {hasAnyNegative && (
          <div className={`border-2 rounded-lg p-6 ${
            isDisputeSaved 
              ? 'border-green-500 bg-green-50' 
              : 'border-red-500 bg-rose-50'
          }`}>
            
            {/* Step 1 - Match Negative Accounts exactly */}
            <div className="flex items-center gap-3 mb-6">
              {isDisputeSaved ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  <ThickCheckIcon className="w-4 h-4" />
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  1
                </span>
              )}
              <span className={`font-bold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>
                {isDisputeSaved ? 'Review this negative item, then scroll down to steps 2 and 3' : 'Review this negative item, then scroll down to steps\u00A02\u00A0and\u00A03'}
              </span>
            </div>

        {/* Bureau Comparison Grid - EXACT MATCH to negative accounts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* TransUnion */}
          <div className="relative">
            {record.reportingBureaus?.TransUnion === false ? (
              <NotReportedByBureauCard bureauName="TransUnion" />
            ) : (
              <>
                <div className={`font-bold mb-1 ${isDisputeSaved ? 'text-green-700' : 'text-cyan-700'}`}>TransUnion</div>
                <div
                  className={`border-3 rounded-lg px-4 pt-4 pb-4 ${
                    isDisputeSaved
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-white'
                  }`}
                >
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-semibold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>{(record['@publicRecordType'] || record.publicRecordType || 'Public Record').toUpperCase()}</h4>
                <Select
                  value={transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')}
                  onValueChange={setTransUnionStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative'
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {(transUnionStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Positive' && (
                        <Check className="w-3 h-3 text-green-600" />
                      )}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-xs">
                {/* Exactly 5 lines - match negative accounts height */}
                <div className="flex justify-between">
                  <span className="text-gray-700">{getFirstFieldData().label}</span>
                  <span className="font-medium text-right whitespace-pre-line max-w-[200px]">
                    {formatCourtName(getFirstFieldData().value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Status:</span>
                  <span className={`font-medium ${record['@_StatusDescription']?.toLowerCase().includes('discharged') || record['@_StatusDescription']?.toLowerCase().includes('satisfied') || record['@_StatusDescription']?.toLowerCase().includes('released') ? 'text-green-600' : 'text-red-600'}`}>
                    {record['@_StatusDescription'] || record['@status'] || record.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Amount:</span>
                  <span className="font-medium">{formatCurrency(record['@_LiabilityAmount'] || record['@amount'] || record.amount || '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Updated:</span>
                  <span className="font-medium">{formatDate(record['@_StatusDate'] || record['@dateUpdated'] || record.dateUpdated || '2024-01-01')}</span>
                </div>

                {/* Additional details - only when expanded */}
                {showAccountDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Date Filed:</span>
                      <span className="font-medium">{formatDate(record['@_FilingDate'] || record.dateFiled || record['@_Date'])}</span>
                    </div>
                    {record['@caseNumber'] || record.caseNumber ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Case Number:</span>
                        <span className="font-medium">{record['@caseNumber'] || record.caseNumber}</span>
                      </div>
                    ) : null}
                    {record['@courtAddress'] || record.courtAddress ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Address:</span>
                        <span className="font-medium">{record['@courtAddress'] || record.courtAddress}</span>
                      </div>
                    ) : null}
                    {record['@courtPhone'] || record.courtPhone ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Phone:</span>
                        <span className="font-medium">{record['@courtPhone'] || record.courtPhone}</span>
                      </div>
                    ) : null}
                    {record['@plaintiff'] || record.plaintiff ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Plaintiff:</span>
                        <span className="font-medium">{record['@plaintiff'] || record.plaintiff}</span>
                      </div>
                    ) : null}
                    {record['@attorneyName'] || record.attorneyName ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Attorney:</span>
                        <span className="font-medium">{record['@attorneyName'] || record.attorneyName}</span>
                      </div>
                    ) : null}
                    {record['@trustee'] || record.trustee ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Trustee:</span>
                        <span className="font-medium">{record['@trustee'] || record.trustee}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            </>
            )}
          </div>

          {/* Equifax - EXACT copy of TransUnion structure */}
          <div className="relative">
            {record.reportingBureaus?.Equifax === false ? (
              <NotReportedByBureauCard bureauName="Equifax" />
            ) : (
              <>
                <div className={`font-bold mb-1 ${isDisputeSaved ? 'text-green-700' : 'text-red-600'}`}>Equifax</div>
                <div
                  className={`border-3 rounded-lg px-4 pt-4 pb-4 ${
                    isDisputeSaved
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-white'
                  }`}
                >
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-semibold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>{(record['@publicRecordType'] || record.publicRecordType || 'Public Record').toUpperCase()}</h4>
                <Select
                  value={equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')}
                  onValueChange={setEquifaxStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative'
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {(equifaxStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Positive' && (
                        <Check className="w-3 h-3 text-green-600" />
                      )}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-xs">
                {/* Exactly 5 lines - match negative accounts height */}
                <div className="flex justify-between">
                  <span className="text-gray-700">{getFirstFieldData().label}</span>
                  <span className="font-medium text-right whitespace-pre-line max-w-[200px]">
                    {formatCourtName(getFirstFieldData().value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Status:</span>
                  <span className={`font-medium ${record['@_StatusDescription']?.toLowerCase().includes('discharged') || record['@_StatusDescription']?.toLowerCase().includes('satisfied') || record['@_StatusDescription']?.toLowerCase().includes('released') ? 'text-green-600' : 'text-red-600'}`}>
                    {record['@_StatusDescription'] || record['@status'] || record.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Amount:</span>
                  <span className="font-medium">{formatCurrency(record['@_LiabilityAmount'] || record['@amount'] || record.amount || '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Updated:</span>
                  <span className="font-medium">{formatDate(record['@_StatusDate'] || record['@dateUpdated'] || record.dateUpdated || '2024-01-01')}</span>
                </div>

                {/* Additional details - only when expanded */}
                {showAccountDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Date Filed:</span>
                      <span className="font-medium">{formatDate(record['@_FilingDate'] || record.dateFiled || record['@_Date'])}</span>
                    </div>
                    {record['@caseNumber'] || record.caseNumber ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Case Number:</span>
                        <span className="font-medium">{record['@caseNumber'] || record.caseNumber}</span>
                      </div>
                    ) : null}
                    {record['@courtAddress'] || record.courtAddress ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Address:</span>
                        <span className="font-medium">{record['@courtAddress'] || record.courtAddress}</span>
                      </div>
                    ) : null}
                    {record['@courtPhone'] || record.courtPhone ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Phone:</span>
                        <span className="font-medium">{record['@courtPhone'] || record.courtPhone}</span>
                      </div>
                    ) : null}
                    {record['@plaintiff'] || record.plaintiff ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Plaintiff:</span>
                        <span className="font-medium">{record['@plaintiff'] || record.plaintiff}</span>
                      </div>
                    ) : null}
                    {record['@attorneyName'] || record.attorneyName ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Attorney:</span>
                        <span className="font-medium">{record['@attorneyName'] || record.attorneyName}</span>
                      </div>
                    ) : null}
                    {record['@trustee'] || record.trustee ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Trustee:</span>
                        <span className="font-medium">{record['@trustee'] || record.trustee}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            </>
            )}
          </div>

          {/* Experian - EXACT copy of TransUnion structure */}
          <div className="relative">
            {record.reportingBureaus?.Experian === false ? (
              <NotReportedByBureauCard bureauName="Experian" />
            ) : (
              <>
                <div className={`font-bold mb-1 ${isDisputeSaved ? 'text-green-700' : 'text-blue-600'}`}>Experian</div>
                <div
                  className={`border-3 rounded-lg px-4 pt-4 pb-4 ${
                    isDisputeSaved
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-white'
                  }`}
                >
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-semibold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>{(record['@publicRecordType'] || record.publicRecordType || 'Public Record').toUpperCase()}</h4>
                <Select
                  value={experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')}
                  onValueChange={setExperianStatus}
                >
                  <SelectTrigger
                    className={`w-24 h-7 text-xs transform translate-x-[10px] [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-100 [&>svg]:shrink-0 border-0 bg-transparent shadow-none hover:bg-gray-50 ${
                      (experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative'
                        ? 'text-red-600 [&>svg]:text-red-600'
                        : 'text-green-700 [&>svg]:text-green-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {(experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Negative' && (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {(experianStatus || (hasAnyNegative ? 'Negative' : 'Positive')) === 'Positive' && (
                        <Check className="w-3 h-3 text-green-600" />
                      )}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-xs">
                {/* Exactly 5 lines - match negative accounts height */}
                <div className="flex justify-between">
                  <span className="text-gray-700">{getFirstFieldData().label}</span>
                  <span className="font-medium text-right whitespace-pre-line max-w-[200px]">
                    {formatCourtName(getFirstFieldData().value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Status:</span>
                  <span className={`font-medium ${record['@_StatusDescription']?.toLowerCase().includes('discharged') || record['@_StatusDescription']?.toLowerCase().includes('satisfied') || record['@_StatusDescription']?.toLowerCase().includes('released') ? 'text-green-600' : 'text-red-600'}`}>
                    {record['@_StatusDescription'] || record['@status'] || record.status || 'Active'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Amount:</span>
                  <span className="font-medium">{formatCurrency(record['@_LiabilityAmount'] || record['@amount'] || record.amount || '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Updated:</span>
                  <span className="font-medium">{formatDate(record['@_StatusDate'] || record['@dateUpdated'] || record.dateUpdated || '2024-01-01')}</span>
                </div>

                {/* Additional details - only when expanded */}
                {showAccountDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Date Filed:</span>
                      <span className="font-medium">{formatDate(record['@_FilingDate'] || record.dateFiled || record['@_Date'])}</span>
                    </div>
                    {record['@caseNumber'] || record.caseNumber ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Case Number:</span>
                        <span className="font-medium">{record['@caseNumber'] || record.caseNumber}</span>
                      </div>
                    ) : null}
                    {record['@courtAddress'] || record.courtAddress ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Address:</span>
                        <span className="font-medium">{record['@courtAddress'] || record.courtAddress}</span>
                      </div>
                    ) : null}
                    {record['@courtPhone'] || record.courtPhone ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Court Phone:</span>
                        <span className="font-medium">{record['@courtPhone'] || record.courtPhone}</span>
                      </div>
                    ) : null}
                    {record['@plaintiff'] || record.plaintiff ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Plaintiff:</span>
                        <span className="font-medium">{record['@plaintiff'] || record.plaintiff}</span>
                      </div>
                    ) : null}
                    {record['@attorneyName'] || record.attorneyName ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Attorney:</span>
                        <span className="font-medium">{record['@attorneyName'] || record.attorneyName}</span>
                      </div>
                    ) : null}
                    {record['@trustee'] || record.trustee ? (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Trustee:</span>
                        <span className="font-medium">{record['@trustee'] || record.trustee}</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            </>
            )}
          </div>
        </div>

          {/* Show More Button - Match negative accounts exact structure */}
          <div className="flex justify-center mt-2 mb-0 relative w-full">
            <button 
              onClick={() => setShowAccountDetails(!showAccountDetails)}
              className={`flex items-center gap-2 transition-colors text-sm font-medium ${
                isDisputeSaved 
                  ? 'text-green-700 hover:text-green-800' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              <span>{showAccountDetails ? 'Show Less' : 'Show More'}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showAccountDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>





            {/* AI Toggle Links positioned above Create Dispute module */}
            {hasAnyNegative && aiScanCompleted && (
              <div className="px-4 md:px-6 py-4 space-y-4">
                {/* AI Violations Alert (if any) */}
                {aiViolations && aiViolations.length > 0 && (
                  <div style={{ marginTop: '-6px' }}>
                    <button
                      onClick={() => {
                        setShowViolations(!showViolations);
                        if (!showViolations) {
                          setShowSuggestions(false); // Close suggestions when opening violations
                        }
                      }}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 p-2 rounded-md transition-colors font-medium"
                    >
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span>
                        View {aiViolations.length} Compliance Violations
                      </span>
                      {showViolations ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Expanded Violations List */}
                    {showViolations && (
                      <div
                        className="space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3"
                        style={{ marginTop: '-2px' }}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <button
                            onClick={() => setShowViolations(!showViolations)}
                            className="text-left hover:bg-blue-100 rounded-md p-2 transition-colors"
                          >
                            <h4 className="text-sm font-medium text-gray-900">Detected Violations</h4>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowViolationSources(!showViolationSources)}
                              className="text-xs text-gray-600 hover:text-gray-800 underline"
                            >
                              {showViolationSources ? 'Hide Sources' : 'Show Sources'}
                            </button>
                            <Button
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Add all violations to dispute form with typing animation
                                if (aiViolations.length > 0) {
                                  const allViolations = aiViolations.join(' ');
                                  await typeText(allViolations, setSelectedReason, setIsTypingReason, 25);
                                  await new Promise((resolve) => setTimeout(resolve, 400));
                                  await typeText(allViolations, setSelectedInstruction, setIsTypingInstruction, 15);
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="px-4 py-2 text-sm font-black bg-blue-600 text-white hover:bg-blue-700 hover:text-white border-blue-600 hover:border-blue-700 min-w-[140px] flex items-center whitespace-nowrap"
                            >
                              <Zap className="w-3 h-3 mr-1 flex-shrink-0" />
                              Use All {aiViolations.length}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {aiViolations.map((violation, index) => (
                            <div key={index} className="p-3 bg-white rounded border border-gray-200">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-blue-200 text-blue-800 border border-blue-300">
                                      Metro 2
                                    </span>
                                    <span className="text-sm font-medium">{violation}</span>
                                  </div>
                                  {showViolationSources && (
                                    <div className="ml-4 text-xs text-gray-500 italic">
                                      Source: CRC Advanced Disputing Workbook, Page 3-46
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Auto-populate both fields with AI typing animation using the actual violation text
                                    const reason = violation.trim();
                                    const instruction = violation.trim();
                                    
                                    // Type reason first
                                    await typeText(reason, setSelectedReason, setIsTypingReason, 25);
                                    
                                    // Brief pause between reason and instruction
                                    await new Promise((resolve) => setTimeout(resolve, 400));
                                    
                                    // Type instruction
                                    await typeText(instruction, setSelectedInstruction, setIsTypingInstruction, 15);
                                  }}
                                  className="border-gray-300"
                                >
                                  Add to Dispute
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
          </div>
        )}

        {/* View AI Dispute Suggestions Link */}
        <div className="mb-4" style={{ marginTop: '-2px' }}>
          <button
            onClick={() => {
              setShowSuggestions(!showSuggestions);
              if (!showSuggestions) {
                setShowViolations(false); // Close violations when opening suggestions
              }
            }}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 p-2 rounded-md transition-colors font-medium"
          >
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span>View AI Dispute Suggestions</span>
            {showSuggestions ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Expanded AI Suggestions */}
          {showSuggestions && (
            <div
              className="space-y-2 bg-blue-50 border border-blue-600 rounded-lg p-3"
              style={{ marginTop: '-2px' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="text-left hover:bg-blue-100 rounded-md p-2 transition-colors"
                >
                  <h4 className="text-sm font-medium text-gray-900">AI Dispute Suggestions</h4>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSuggestionSources(!showSuggestionSources)}
                    className="text-xs text-gray-600 hover:text-gray-800 underline"
                  >
                    {showSuggestionSources ? 'Hide Sources' : 'Show Sources'}
                  </button>
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                    aria-label="Close suggestions"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-white rounded border border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-blue-200 text-blue-800 border border-blue-300">
                            AI Suggestion
                          </span>
                          <span className="text-sm font-medium">{suggestion}</span>
                        </div>
                        {showSuggestionSources && (
                          <div className="ml-4 text-xs text-gray-500 italic">
                            Source: CRC Basic Disputing Course, Page 1-15
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Auto-populate both fields with AI typing animation using the actual suggestion text
                          const reason = suggestion.trim();
                          const instruction = suggestion.trim();
                          
                          // Type reason first
                          await typeText(reason, setSelectedReason, setIsTypingReason, 25);
                          
                          // Brief pause between reason and instruction
                          await new Promise((resolve) => setTimeout(resolve, 400));
                          
                          // Type instruction
                          await typeText(instruction, setSelectedInstruction, setIsTypingInstruction, 15);
                        }}
                        className="border-gray-300"
                      >
                        Add to Dispute
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

            {/* Gray Horizontal Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Create Dispute Section */}
            <div className="space-y-4">
              {/* Step 2 Header - Match Negative Accounts exactly */}
              <div className="flex items-center gap-3">
                {isDisputeSaved ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                    <ThickCheckIcon className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">2</span>
                )}
                <span className={`font-bold ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>
                  Create Dispute
                </span>
              </div>

              {/* Dispute Reason */}
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>Dispute Reason</label>
                <select
                  value={selectedReason || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isDisputeSaved) {
                      setIsDisputeSaved(false);
                    }
                    if (value === '__custom__') {
                      setShowCustomReasonField(true);
                      setSelectedReason('');
                      setCustomReason('');
                    } else if (value !== '') {
                      setCustomReason(value);
                      setSelectedReason(value);
                      setShowCustomReasonField(false);
                    }
                  }}
                  className={`w-full border bg-white h-[40px] px-3 text-sm rounded-md focus:outline-none dispute-reason-field ${hasAnyNegative ? (isDisputeSaved ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-gray-300 focus:border-gray-400'}`}
                >
                  <option value="">Select dispute reason...</option>
                  {disputeReasons.slice(1, -1).map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Write custom reason...</option>
                </select>
              </div>

              {/* Dispute Instruction */}
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDisputeSaved ? 'text-green-700' : 'text-black'}`}>Dispute Instruction</label>
                <select
                  value={selectedInstruction || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isDisputeSaved) {
                      setIsDisputeSaved(false);
                    }
                    if (value === '__custom__') {
                      setShowCustomInstructionField(true);
                      setSelectedInstruction('');
                      setCustomInstruction('');
                    } else if (value !== '') {
                      setCustomInstruction(value);
                      setSelectedInstruction(value);
                      setShowCustomInstructionField(false);
                    }
                  }}
                  className={`w-full border bg-white h-[40px] px-3 text-sm rounded-md focus:outline-none dispute-instruction-field ${hasAnyNegative ? (isDisputeSaved ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-gray-300 focus:border-gray-400'}`}
                >
                  <option value="">Select dispute instruction...</option>
                  {disputeInstructions.slice(1, -1).map((instruction) => (
                    <option key={instruction} value={instruction}>
                      {instruction}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Write custom instruction...</option>
                </select>
              </div>

              {/* Step 3 - Match Negative Accounts exactly */}
              <div className="flex gap-2 justify-between items-center pt-2">
                {hasAnyNegative && !isDisputeSaved ? (
                  <div className="warning-container">
                    <AlertTriangle className="hidden md:block w-4 h-4 warning-icon" />
                    <span className="text-xs md:text-sm font-medium warning-text">
                      <span className="md:hidden">Complete<br />& Save</span>
                      <span className="hidden md:inline">Complete Reason & Instruction</span>
                    </span>
                  </div>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center gap-2 relative overflow-visible">
                  {isDisputeSaved ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white mr-1">
                      <ThickCheckIcon className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white mr-1">3</span>
                  )}
                  <Button
                    disabled={isButtonDisabled && !isDisputeSaved}
                    onClick={handleSaveDispute}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      isDisputeSaved
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : isButtonDisabled
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isDisputeSaved ? (
                      <div className="flex items-center gap-2">
                        <ThickCheckIcon className="w-4 h-4" />
                        <span>Dispute Saved</span>
                      </div>
                    ) : (
                      'Save Dispute and Continue'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
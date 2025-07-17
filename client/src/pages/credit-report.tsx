import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Credit Report Components
import { CreditReportHeader } from '@/components/credit-report/header';

import { PersonalInfo } from '@/components/credit-report/personal-info';
import { CreditSummary } from '@/components/credit-report/credit-summary';
import { CompletionCenter } from '@/components/credit-report/completion-center';
import { DisputeModal } from '@/components/credit-report/dispute-modal';
import { RippleLoader } from '@/components/ui/ripple-loader';
import { CloudyRippleLoader } from '@/components/ui/cloudy-ripple-loader';

import { SavedCheckIcon } from '@/components/ui/saved-check-icon';
import { NameHeader } from '@/components/credit-report/name-header';
import CollapsedCreditCard from "@/components/ui/collapsed-credit-card";
import { AiScanSection } from '@/components/credit-report/ai-scan-section';
import { CreditScoresSection } from '@/components/credit-report/credit-scores-section';
import { InstructionsBanner } from '@/components/credit-report/instructions-banner';
import { HardInquiriesSection } from '@/components/credit-report/hard-inquiries-section';
import { PublicRecordsSection } from '@/components/credit-report/public-records-section';
import PositiveClosedAccountsSection from '@/components/credit-report/positive-closed-accounts-section';
import { NegativeAccountsSection } from '@/components/credit-report/negative-accounts-section';

// Credit Accounts Collapsed Card Component
const CreditAccountsCollapsedCard = ({ negativeAccounts, positiveAccounts, savedDisputes, creditAccountsCollapsed, onExpand }: {
  negativeAccounts: any[];
  positiveAccounts?: any[];
  savedDisputes: any;
  creditAccountsCollapsed: boolean;
  onExpand: () => void;
}) => {
  // Memoized calculation for unsaved negative accounts - persistent across expand/collapse actions
  const hasUnsavedNegativeAccounts = useMemo(() => {
    const hasUnsaved = negativeAccounts.some((account: any) => {
      const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return !savedDisputes[accountId];
    });
    
    return hasUnsaved;
  }, [negativeAccounts, savedDisputes]);

  // Check if all negative accounts are saved
  const allNegativeAccountsSaved = useMemo(() => {
    if (negativeAccounts.length === 0) return false;
    return negativeAccounts.every((account: any) => {
      const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return savedDisputes[accountId];
    });
  }, [negativeAccounts, savedDisputes]);

  // Get bureaus with saved disputes for Credit Accounts
  const getSavedBureauNames = () => {
    const savedBureaus = new Set<string>();
    
    negativeAccounts.forEach(account => {
      const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      if (savedDisputes[accountId]) {
        // Get bureau from account's credit repository
        const repository = account.CREDIT_REPOSITORY;
        if (Array.isArray(repository)) {
          repository.forEach((repo: any) => {
            const sourceType = repo['@_SourceType'];
            if (sourceType === 'TransUnion') savedBureaus.add('TransUnion');
            if (sourceType === 'Equifax') savedBureaus.add('Equifax');
            if (sourceType === 'Experian') savedBureaus.add('Experian');
          });
        } else if (repository?.['@_SourceType']) {
          const sourceType = repository['@_SourceType'];
          if (sourceType === 'TransUnion') savedBureaus.add('TransUnion');
          if (sourceType === 'Equifax') savedBureaus.add('Equifax');
          if (sourceType === 'Experian') savedBureaus.add('Experian');
        }
      }
    });
    
    const bureauArray = Array.from(savedBureaus);
    console.log(`Saved bureaus for Credit Accounts: [${bureauArray.join(', ')}]`);
    
    return bureauArray;
  };

  // Format bureau names for display
  const formatBureauNames = (bureaus: string[]): string => {
    if (bureaus.length === 0) return '';
    if (bureaus.length === 1) return bureaus[0];
    if (bureaus.length === 2) return `${bureaus[0]} and ${bureaus[1]}`;
    return `${bureaus[0]}, ${bureaus[1]}, and ${bureaus[2]}`;
  };

  const savedBureauNames = getSavedBureauNames();
  const bureauText = formatBureauNames(savedBureauNames);
  
  const getUnsavedItemsMessage = () => {
    const unsavedCount = negativeAccounts.filter((account: any) => {
      const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return !savedDisputes[accountId];
    }).length;
    
    if (unsavedCount > 0) {
      return `${unsavedCount} negative account${unsavedCount > 1 ? 's' : ''} need dispute review`;
    }
    return '';
  };

  // Count unsaved negative accounts for badge display
  const unsavedNegativeAccountsCount = negativeAccounts.filter((account: any) => {
    const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
    return !savedDisputes[accountId];
  }).length;

  const allAccountsCount = negativeAccounts.length + (positiveAccounts?.length || 0);
  
  // Console logging for Credit Accounts
  console.log("Credit Accounts - Negative accounts needing review:", unsavedNegativeAccountsCount);
  
  return (
    <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg rounded-lg ${
      hasUnsavedNegativeAccounts ? 'border-2 border-red-500 bg-red-50' : 
      (allNegativeAccountsSaved ? 'border-2 border-green-600 bg-green-50' : 
      'border border-gray-200 bg-white hover:border-gray-300')
    } overflow-hidden`}>
      <CardHeader
        className={`cursor-pointer ${hasUnsavedNegativeAccounts ? 'bg-red-50 hover:bg-red-100' : (allNegativeAccountsSaved ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50')} transition-colors duration-200`}
        onClick={onExpand}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            {hasUnsavedNegativeAccounts ? (
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold">
                {unsavedNegativeAccountsCount}
              </div>
            ) : (allNegativeAccountsSaved ? (
              <SavedCheckIcon />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-bold">
                {negativeAccounts.length}
              </div>
            ))}
            <div>
              <h3 className={`text-lg font-bold ${hasUnsavedNegativeAccounts ? 'text-red-700' : (allNegativeAccountsSaved ? 'text-green-700' : 'text-gray-700')}`}>
                {allNegativeAccountsSaved ? 'Credit Accounts – All Negative Account Disputes Saved' : 'Credit Accounts'}
              </h3>
              <p className={`text-sm ${hasUnsavedNegativeAccounts ? 'text-red-700' : (allNegativeAccountsSaved ? 'text-green-700' : 'text-gray-600')} mt-1`}>
                {hasUnsavedNegativeAccounts ? `${unsavedNegativeAccountsCount} negative account${unsavedNegativeAccountsCount !== 1 ? 's' : ''} need dispute review` : (allNegativeAccountsSaved ? `You've saved disputes for ${negativeAccounts.length} ${negativeAccounts.length === 1 ? 'credit account' : 'credit accounts'} across ${bureauText}.` : `${negativeAccounts.length} negative account${negativeAccounts.length !== 1 ? 's' : ''} may be impacting your credit score`)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">{allAccountsCount} accounts</span>
            <ChevronDown />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

// Utilities and Data
import { initializeCreditData } from '@/lib/credit-data';
import { loadCreditReportData } from '@/lib/data-loader';

// Import bureau logos and score gauge
import transUnionLogo from '../assets/transunion-logo.png';
import equifaxLogo from '../assets/equifax-logo.png';
import experianLogo from '../assets/experian-logo.png';
import scoreGaugeArc from '../assets/score-gauge-arc.png';

export default function CreditReportPage() {
  
  // Removed scrollToSection hook to prevent continuous auto-scrolling interference
  
  // State flags to prevent scroll conflicts
  const [isChoreographyScrolling, setIsChoreographyScrolling] = useState(false);
  const [isButtonScrolling, setIsButtonScrolling] = useState(false);
  
  // Removed scrollToSectionOnExpand function to prevent continuous auto-scrolling interference
  
  // Core data state
  const [creditData, setCreditData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dispute management state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [savedDisputes, setSavedDisputes] = useState<{
    [accountId: string]: boolean | { reason: string; instruction: string; violations?: string[] };
  }>({});

  // AI scanning state
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiViolations, setAiViolations] = useState<{ [accountId: string]: string[] }>({});
  const [aiSuggestions, setAiSuggestions] = useState<{ [accountId: string]: string[] }>({});
  const [aiScanCompleted, setAiScanCompleted] = useState(false);
  const [aiScanDismissed, setAiScanDismissed] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState("");
  const [aiSummaryData, setAiSummaryData] = useState<{
    totalViolations: number;
    affectedAccounts: number;
  }>({
    totalViolations: 0,
    affectedAccounts: 0,
  });

  // Hard Inquiries auto-collapse state
  type SavedInquiry = { bureau: 'TU' | 'EQ' | 'EX'; isRecent: boolean };
  const [savedInquiries, setSavedInquiries] = useState<Record<string, SavedInquiry>>({});
  const [hardCollapsed, setHardCollapsed] = useState(true);
  
  // Hard Inquiries sub-card saved states
  const [olderInquiriesSaved, setOlderInquiriesSaved] = useState(false);
  const [recentInquiriesSaved, setRecentInquiriesSaved] = useState(false);

  // UI state management
  const [showCreditAccounts, setShowCreditAccounts] = useState(false);
  const [showPositiveAccounts, setShowPositiveAccounts] = useState(false);
  const [showNegativeAccounts, setShowNegativeAccounts] = useState(true);
  const [creditAccountsCollapsed, setCreditAccountsCollapsed] = useState(true);
  const [creditCardVersion, setCreditCardVersion] = useState(0);

  const [showHardInquiries, setShowHardInquiries] = useState(false);
  const [showCreditSummary, setShowCreditSummary] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [negativeAccountsCollapsed, setNegativeAccountsCollapsed] = useState(true);
  const [userHasManuallyExpanded, setUserHasManuallyExpanded] = useState(false);
  
  // Credit Summary review saved state
  const [creditSummaryReviewSaved, setCreditSummaryReviewSaved] = useState(false);

  // Personal Information saved state management
  const [personalInfoSelections, setPersonalInfoSelections] = useState<Record<string, boolean>>({});
  const [personalInfoDispute, setPersonalInfoDispute] = useState<{
    selectedItems: string[];
    reason: string;
    instruction: string;
  } | null>(null);

  // Recent Inquiries saved state management
  const [recentInquirySelections, setRecentInquirySelections] = useState<{ [key: string]: boolean }>({});
  const [recentInquiryDispute, setRecentInquiryDispute] = useState<{
    reason: string;
    instruction: string;
    selectedInquiries: string[];
  } | null>(null);

  // Older Inquiries saved state management  
  const [olderInquirySelections, setOlderInquirySelections] = useState<Array<{
    id: string;
    bureau: string;
    creditor: string;
  }>>([]);
  const [olderInquiryDispute, setOlderInquiryDispute] = useState<{
    reason: string;
    instruction: string;
    selectedInquiries: string[];
  } | null>(null);

  // Refs for scroll behavior
  const negativeAccountsRef = useRef<HTMLDivElement>(null);
  const creditAccountsRef = useRef<HTMLDivElement>(null);
  const publicRecordsRef = useRef<HTMLDivElement>(null);

  // Initialize credit data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const data = await initializeCreditData();
        setCreditData(data);
        
        // 1️⃣ CREDIT DATA LOGGING: Show full creditData value on initial load
        
        // ✅ STEP 3 VERIFICATION: Console log full loaded data
        const creditLiabilities = data?.CREDIT_RESPONSE?.CREDIT_LIABILITY || [];
        const borrower = data?.CREDIT_RESPONSE?.BORROWER || {};
        const negativeAccounts = creditLiabilities.filter(account => account['@_DerogatoryDataIndicator'] === 'Y');
        
        if (creditLiabilities.length > 0) {
        }
        
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Failed to load credit data:', error);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // 2️⃣ FORCE UI REFRESH: Trigger full UI update when creditData is loaded
  useEffect(() => {
    if (creditData && creditData.CREDIT_RESPONSE && creditData.CREDIT_RESPONSE.CREDIT_LIABILITY) {
      
      // Force re-render by updating a state that forces component refresh
      setIsLoading(false);
      
      // Additional confirmation logs
    }
  }, [creditData]);

  // Function to determine if an account is negative (must be defined before useMemo hooks)
  const isNegativeAccount = (account: any) => {
    // 1. Check derogatory data indicator
    if (account['@_DerogatoryDataIndicator'] === 'Y') {
      return true;
    }

    // 2. Check for collection accounts
    if (account['@IsCollectionIndicator'] === 'true' || account['@IsCollectionIndicator'] === 'Y') {
      return true;
    }

    // 3. Check for charge-off accounts
    if (account['@IsChargeoffIndicator'] === 'true' || account['@IsChargeoffIndicator'] === 'Y') {
      return true;
    }

    // 4. Check for past due amounts (indicates late payments)
    const pastDue = parseInt(account['@_PastDueAmount'] || '0');
    if (pastDue > 0) {
      return true;
    }

    // 5. Check current rating code for late payments (2-9 indicate late payments)
    const currentRating = account._CURRENT_RATING?.['@_Code'];
    if (currentRating && ['2', '3', '4', '5', '6', '7', '8', '9'].includes(currentRating)) {
      return true;
    }

    // 6. Check for charge-off date
    if (account['@_ChargeOffDate']) {
      return true;
    }

    return false;
  };

  // ---------- DERIVED HOOKS (ALWAYS RUN) ----------
  const accounts = useMemo(() => {
    const accountsArray = creditData?.CREDIT_RESPONSE?.CREDIT_LIABILITY || [];
    return accountsArray;
  }, [creditData]);
  
  const negativeAccounts = useMemo(() => {
    const negativeArray = accounts.filter((account: any) => isNegativeAccount(account));
    return negativeArray;
  }, [accounts]);
  
  const hasUnsavedNegatives = useMemo(() => {
    return negativeAccounts.some((account: any) => {
      const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return !savedDisputes[accountId];
    });
  }, [negativeAccounts, savedDisputes]);

  // Check if all negative accounts are saved
  const allNegativeAccountsSaved = useMemo(() => {
    if (negativeAccounts.length === 0) return false;
    return negativeAccounts.every((account: any) => {
      const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return savedDisputes[accountId];
    });
  }, [negativeAccounts, savedDisputes]);

  // Calculate unsaved NEGATIVE accounts for warningCount (only negative accounts count as warnings)
  const unsavedNegativeAccounts = useMemo(() => {
    return negativeAccounts.filter(account => {
      const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return !savedDisputes[accountId];
    });
  }, [negativeAccounts, savedDisputes]);

  // --- DERIVED FLAGS -----------------------------
  const showRedOnCreditAccounts = useMemo(() => {
    return hasUnsavedNegatives && creditAccountsCollapsed;
  }, [hasUnsavedNegatives, creditAccountsCollapsed]);

  const showRedOnNegativeAccounts = useMemo(() => {
    return (
      hasUnsavedNegatives &&
      !creditAccountsCollapsed &&          // Credit is expanded
      negativeAccountsCollapsed           // Negative is collapsed
    );
  }, [hasUnsavedNegatives, creditAccountsCollapsed, negativeAccountsCollapsed]);



  const positiveAccounts = useMemo(() => {
    const positiveArray = accounts.filter((account: any) => !isNegativeAccount(account));
    return positiveArray;
  }, [accounts]);

  // Create enhanced public records from credit data
  const publicRecords = useMemo(() => {
    // Filter accounts that are public record types (13-16, 93-95)
    const publicRecordsFromCredit = accounts
      .filter(
        (account: any) =>
          account['@_AccountType'] &&
          ['13', '14', '15', '16', '93', '94', '95'].includes(account['@_AccountType'])
      )
      .map((account: any) => ({
        ...account,
        '@publicRecordType':
          account['@_AccountType'] === '93'
            ? 'BANKRUPTCY'
            : account['@_AccountType'] === '94'
            ? 'TAX LIEN'
            : account['@_AccountType'] === '95'
            ? 'JUDGMENT'
            : 'PUBLIC RECORD',
        '@courtName': account['@_SubscriberName'] || 'Court Name Not Available',
        '@courtAddress': 'Court Address Not Available',
        caseNumber: account['@_AccountNumber'] || 'Case Number Not Available',
        filingDate: account['@_AccountOpenedDate'] || 'Filing Date Not Available',
        status: account['@_AccountStatusType'] || 'Status Not Available',
      }));

    // Get public records from the existing structure if available
    const existingPublicRecords = creditData?.CREDIT_RESPONSE?.CREDIT_PUBLIC_RECORD || [];

    // Combine both sources, giving priority to existing public records
    const allPublicRecords = [...existingPublicRecords, ...publicRecordsFromCredit];

    // Show all public records (they are typically negative by nature)
    const finalPublicRecords = allPublicRecords.length > 0 ? allPublicRecords : publicRecordsFromCredit;
    
    
    return finalPublicRecords;
  }, [accounts, creditData]);

  const hasPublicRecords = useMemo(() => {
    const hasRecords = publicRecords && publicRecords.length > 0;
    return hasRecords;
  }, [publicRecords]);





  const toggleCreditAccounts = () => {
    setCreditAccountsCollapsed(prev => {
      const willBeExpanded = prev; // If currently collapsed (prev = true), will be expanded
      
      // If expanding from collapsed state, trigger smooth scroll
      if (willBeExpanded && creditAccountsRef.current) {
        setTimeout(() => {
          const elementTop = creditAccountsRef.current!.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementTop - 20; // 20px offset above header
          
          console.log('🔄 Credit Accounts expand: Scrolling to position', offsetPosition);
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }, 100); // Small delay to ensure DOM updates
      }
      
      return !prev;
    });
    setCreditCardVersion(v => v + 1);   // force remount ⇒ no grey state
    setShowCreditAccounts(true);       // ensure expanded content shows
  };

  // Handle Credit Accounts collapse from last negative account choreography
  const handleCreditAccountsCollapse = () => {
    setCreditAccountsCollapsed(true);
    setCreditCardVersion(v => v + 1);   // force remount to show green state
    setShowCreditAccounts(false);       // ensure collapsed content shows
  };
  // -------------------------------------------------

  // Load credit data using the comprehensive data loader
  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedData = await loadCreditReportData();
        setCreditData(loadedData);
      } catch (error) {
        console.error('❌ Error loading credit data:', error);
      } finally {
        // Keep loader visible for minimum 5 seconds to show Cloudy animation
        setTimeout(() => {
          setIsLoading(false);
        }, 5000);
      }
    };

    loadData();
  }, []);

  // DISABLED: Global choreography moved to individual account level to prevent conflicts
  // Individual account choreography is handled in account-row.tsx

  // REMOVED: Credit Accounts auto-collapse effect - Maintains section independence
  // Previously automatically collapsed Credit Accounts section when all negative accounts were saved
  // This violated section independence principle where changes in one section should not affect others
  /*
  useEffect(() => {
    // Use the existing negativeAccounts from useMemo hook

    if (negativeAccounts.length === 0) {
      return;
    }

    const allNegativeAccountsSaved = negativeAccounts.every((account: any) => {
      const accountId =
        account['@CreditLiabilityID'] ||
        account['@_AccountNumber'] ||
        account['@_AccountIdentifier'];
      return savedDisputes[accountId];
    });

    if (allNegativeAccountsSaved && !creditAccountsCollapsed) {
      // Use shared scroll hook for consistent choreography
      scrollToSection('credit-accounts', () => {
        setCreditAccountsCollapsed(true);
        setCreditCardVersion(v => v + 1);
      });
    }
  }, [savedDisputes, creditData, creditAccountsCollapsed, scrollToSection]);
  */

  // Hard Inquiries auto-collapse effect - CASCADE behavior when both sub-cards saved
  // REMOVED: Auto-collapse Hard Inquiries useEffect
  // Previously automatically collapsed Hard Inquiries section when both sub-cards were saved
  // Now Hard Inquiries stays open until manually closed by user
  /*
  useEffect(() => {
    // Check if both sub-cards are saved to trigger parent collapse
    if (!hardCollapsed && olderInquiriesSaved && recentInquiriesSaved) {
      setTimeout(() => {
        // hardInquiriesRef removed - now handled by HardInquiriesSection component
        window.scrollBy(0, -20);
        setHardCollapsed(true);
      }, 500);
    }
  }, [olderInquiriesSaved, recentInquiriesSaved, hardCollapsed]);
  */

  // Event handlers

  const handleDisputeSaved = (
    accountId: string,
    disputeData?: { reason: string; instruction: string; violations?: string[] }
  ) => {
    setSavedDisputes((prev) => ({
      ...prev,
      [accountId]: disputeData || true,
    }));
  };

  const handleDisputeReset = (accountId: string) => {
    setSavedDisputes((prev) => {
      const newDisputes = { ...prev };
      delete newDisputes[accountId];
      return newDisputes;
    });
  };

  const handleContinueToWizard = () => {
  };

  const handleShowDisputeItems = () => {
  };

  // Hard Inquiries callback handlers
  const handleInquirySaved = (id: string, bureau: 'TU' | 'EQ' | 'EX', isRecent: boolean) => {
    setSavedInquiries((prev) => ({ ...prev, [id]: { bureau, isRecent } }));
  };

  const handleInquiryReset = (id: string) => {
    setSavedInquiries((prev) => {
      const { [id]: _unused, ...rest } = prev;
      return rest;
    });
  };

  // Personal Information dispute save handler
  const handlePersonalInfoDisputeSaved = (disputeData?: {
    selectedItems: { [key: string]: boolean };
    reason: string;
    instruction: string;
  }) => {
    if (disputeData) {
      setPersonalInfoSelections(disputeData.selectedItems);
      setPersonalInfoDispute({
        reason: disputeData.reason,
        instruction: disputeData.instruction,
        selectedItems: Object.keys(disputeData.selectedItems).filter(
          (key) => disputeData.selectedItems[key]
        ),
      });
    }

    setSavedDisputes((prev) => ({
      ...prev,
      'personal-info': true,
    }));
  };

  // Recent Inquiries dispute save handler
  const handleRecentInquiryDisputeSaved = (disputeData?: {
    selectedInquiries: Array<{ id: string; bureau: string; creditor: string }>;
    reason: string;
    instruction: string;
  }) => {
    if (disputeData) {
      setRecentInquirySelections(disputeData.selectedInquiries);
      setRecentInquiryDispute({
        reason: disputeData.reason,
        instruction: disputeData.instruction,
        selectedInquiries: disputeData.selectedInquiries.map(inq => inq.id),
      });
    }

    setSavedDisputes((prev) => ({
      ...prev,
      'recent-inquiries': true,
    }));
    setRecentInquiriesSaved(true);
  };

  // Older Inquiries dispute save handler
  const handleOlderInquiryDisputeSaved = (disputeData?: {
    selectedInquiries: Array<{ id: string; bureau: string; creditor: string }>;
    reason: string;
    instruction: string;
  }) => {
    if (disputeData) {
      setOlderInquirySelections(disputeData.selectedInquiries);
      setOlderInquiryDispute({
        reason: disputeData.reason,
        instruction: disputeData.instruction,
        selectedInquiries: disputeData.selectedInquiries.map(inq => inq.id),
      });
    }

    setSavedDisputes((prev) => ({
      ...prev,
      'older-inquiries': true,
    }));
    setOlderInquiriesSaved(true);
  };



  const handleAiScan = async () => {
    setIsAiScanning(true);
    setScanProgress(0);
    setScanMessage("Initializing AI analysis...");

    try {
      // ✅ SIMPLIFIED: Pre-filter data on frontend before sending to backend
      const creditLiabilityData = creditData?.CREDIT_RESPONSE?.CREDIT_LIABILITY || [];
      
      console.log(`📊 FRONTEND: Pre-filtering ${creditLiabilityData.length} total accounts`);
      
      // Filter negative accounts using the same logic as isNegativeAccount
      const negativeAccounts = creditLiabilityData.filter((account: any) => {
        // 1. Check derogatory data indicator
        if (account['@_DerogatoryDataIndicator'] === 'Y') {
          return true;
        }

        // 2. Check for collection accounts
        if (account['@IsCollectionIndicator'] === 'true' || account['@IsCollectionIndicator'] === 'Y') {
          return true;
        }

        // 3. Check for charge-off accounts
        if (account['@IsChargeoffIndicator'] === 'true' || account['@IsChargeoffIndicator'] === 'Y') {
          return true;
        }

        // 4. Check for past due amounts (indicates late payments)
        const pastDue = parseInt(account['@_PastDueAmount'] || '0');
        if (pastDue > 0) {
          return true;
        }

        // 5. Check current rating code for late payments (2-9 indicate late payments)
        const currentRating = account._CURRENT_RATING?.['@_Code'];
        if (currentRating && ['2', '3', '4', '5', '6', '7', '8', '9'].includes(currentRating)) {
          return true;
        }

        // 6. Check for charge-off date
        if (account['@_ChargeOffDate']) {
          return true;
        }

        return false;
      });

      // Filter public records from credit liabilities
      const publicRecords = creditLiabilityData.filter((account: any) =>
        account['@_AccountType'] &&
        ['13', '14', '15', '16', '93', '94', '95'].includes(account['@_AccountType'])
      );

      // Get inquiries data
      const inquiriesData = creditData?.CREDIT_RESPONSE?.CREDIT_INQUIRY || [];
      
      // Filter recent inquiries (within 24 months)
      const recentInquiries = inquiriesData.filter((inquiry: any) => {
        const inquiryDate = new Date(inquiry['@_InquiryDate']);
        const today = new Date();
        const monthsAgo = new Date(today.getFullYear(), today.getMonth() - 24, today.getDate());
        return inquiryDate > monthsAgo;
      });

      console.log(`📊 FRONTEND: Pre-filtered data summary:`);
      console.log(`  - Negative accounts: ${negativeAccounts.length}`);
      console.log(`  - Public records: ${publicRecords.length}`);
      console.log(`  - Recent inquiries: ${recentInquiries.length}`);

      // Send pre-filtered data to backend
      const requestPayload = {
        CREDIT_LIABILITY: negativeAccounts,
        PUBLIC_RECORD: publicRecords,
        INQUIRY: recentInquiries
      };

      const response = await fetch('/api/ai-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      
      if (response.ok) {
        const result = await response.json();

        // Update UI state with results
        setAiViolations(result.violations || {});
        setAiSuggestions(result.suggestions || {});
        
        setAiSummaryData({ 
          totalViolations: result.totalViolations || 0, 
          affectedAccounts: result.affectedAccounts || 0 
        });
        setAiScanCompleted(true);
        setShowAiSummary(true);
        setIsAiScanning(false);
        setScanProgress(100);
        setScanMessage("Analysis complete!");
        
      } else {
        console.error("❌ AI scan failed:", response.statusText);
        handleScanError(`Request failed: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ AI scan error:', error);
      handleScanError(error instanceof Error ? error.message : "Unknown error occurred");
    }
  };

  const handleScanError = (errorMessage: string) => {
    console.error('AI scan failed:', errorMessage);
    
    // Fallback to basic static analysis result
    setAiViolations({});
    setAiSummaryData({ totalViolations: 0, affectedAccounts: 0 });
    setShowAiSummary(true);
    setIsAiScanning(false);
    setScanProgress(0);
    setScanMessage("Analysis completed using compliance database");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <RippleLoader />
      </div>
    );
  }





  // Create enhanced public records from credit data
  // This duplicate publicRecords derivation is handled in the useMemo hook above

  // Calculate recent inquiries count (inquiries within 24 months)

  // Calculate counts
  const disputeReasons = [
    'This account does not belong to me',
    'Account information is inaccurate',
    'Payment history is incorrect',
    'Account should be closed/paid',
    'Duplicate account reporting',
    'Identity theft/fraud account',
    'Settled account still showing balance',
    'Account beyond statute of limitations',
    'Incorrect dates (opened/closed/last activity)',
    'Unauthorized charges on this account',
  ];

  const disputeInstructions = [
    'Please remove this inaccurate information immediately',
    'Verify and correct all account details',
    'Update payment history to reflect accurate information',
    'Remove this account as it has been paid in full',
    'Delete this duplicate entry from my credit report',
    'Remove this fraudulent account immediately',
    'Update account to show zero balance',
    'Remove this time-barred account',
    'Correct all dates associated with this account',
    'Remove all unauthorized charges and related negative marks',
  ];

  // Compute negative accounts summary text
  const totalSavedNegativeDisputes = negativeAccounts.filter((account: any) => {
    const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
    return savedDisputes[accountId];
  }).length;
  const negativeAccountsSummaryText = `You've saved disputes for ${totalSavedNegativeDisputes} negative account(s) across TransUnion, Equifax, and Experian.`;

  // Show Cloudy Ripple Loader only when creditData is null (initial load)
  if (creditData === null) {
    return <CloudyRippleLoader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-2 px-4">
        {/* Header */}
        <CreditReportHeader />

        {/* Name Section */}
        <NameHeader creditData={creditData} />

        {/* AI-Powered Compliance Scan */}
        <AiScanSection
          isAiScanning={isAiScanning}
          showAiSummary={showAiSummary}
          aiScanDismissed={aiScanDismissed}
          aiSummaryData={aiSummaryData}
          aiViolations={aiViolations}
          onAiScan={handleAiScan}
          onDismissAiSummary={() => {
            setShowAiSummary(false);
            setAiScanDismissed(true);
          }}
          creditData={creditData}
          scanProgress={scanProgress}
          scanMessage={scanMessage}
        />

        {/* Credit Scores */}
        <CreditScoresSection
          transUnionLogo={transUnionLogo}
          equifaxLogo={equifaxLogo}
          experianLogo={experianLogo}
          scoreGaugeArc={scoreGaugeArc}
        />

        {/* Friendly Instructions */}
        <InstructionsBanner />

        {/* Credit Summary Section */}
        <div className="mb-4" data-section="credit-summary">
          <CreditSummary 
            creditData={creditData}
            isReviewSaved={creditSummaryReviewSaved}
            onReviewSaved={() => setCreditSummaryReviewSaved(true)}
            onReviewReset={() => setCreditSummaryReviewSaved(false)}
            isExpanded={showCreditSummary}
            setIsExpanded={setShowCreditSummary}
            onExpand={() => {/* Removed scrollToSectionOnExpand to prevent auto-scroll loop */}}
          />
        </div>

        {/* Personal Information Section */}
        <div className="mb-4">
          <PersonalInfo
            borrower={creditData?.CREDIT_RESPONSE?.BORROWER || {}}
            reportInfo={creditData?.CREDIT_RESPONSE || {}}
            creditData={creditData}
            onDisputeSaved={handlePersonalInfoDisputeSaved}
            onHeaderReset={() => {
              setSavedDisputes((prev) => ({
                ...prev,
                'personal-info': false,
              }));
              setPersonalInfoSelections({});
              setPersonalInfoDispute(null);
            }}
            initialSelections={personalInfoSelections}
            initialDisputeData={personalInfoDispute}
            forceExpanded={false}
            onExpand={() => {/* Removed scrollToSectionOnExpand to prevent auto-scroll loop */}}
            isButtonScrolling={isButtonScrolling}
            setIsButtonScrolling={setIsButtonScrolling}
          />
        </div>

        {/* Hard Inquiries Section */}
        <div data-section="hard-inquiries">
          <HardInquiriesSection
            creditData={creditData}
            savedDisputes={savedDisputes}
            onDisputeSaved={handleDisputeSaved}
            onDisputeReset={handleDisputeReset}
            onInquirySaved={handleInquirySaved}
            onInquiryReset={handleInquiryReset}
            hardCollapsed={hardCollapsed}
            setHardCollapsed={setHardCollapsed}
            showHardInquiries={showHardInquiries}
            setShowHardInquiries={setShowHardInquiries}
            aiViolations={aiViolations}
            aiSuggestions={aiSuggestions}
            aiScanCompleted={aiScanCompleted}
            recentInquiriesSaved={recentInquiriesSaved}
            setRecentInquiriesSaved={setRecentInquiriesSaved}
            recentInquirySelections={recentInquirySelections}
            setRecentInquirySelections={setRecentInquirySelections}
            recentInquiryDispute={recentInquiryDispute}
            setRecentInquiryDispute={setRecentInquiryDispute}
            onRecentInquiryDisputeSaved={handleRecentInquiryDisputeSaved}
            olderInquiriesSaved={olderInquiriesSaved}
            setOlderInquiriesSaved={setOlderInquiriesSaved}
            olderInquirySelections={olderInquirySelections}
            setOlderInquirySelections={setOlderInquirySelections}
            olderInquiryDispute={olderInquiryDispute}
            setOlderInquiryDispute={setOlderInquiryDispute}
            onOlderInquiryDisputeSaved={handleOlderInquiryDisputeSaved}
            onExpand={() => {/* Removed scrollToSectionOnExpand to prevent auto-scroll loop */}}
            onOlderExpand={() => {/* Removed scrollToSectionOnExpand to prevent auto-scroll loop */}}
          />
        </div>

        {/* Credit Accounts Master Section */}
        <div className="mb-4" ref={creditAccountsRef} data-section="credit-accounts">
          {creditAccountsCollapsed ? (
            <CollapsedCreditCard collapsed={creditAccountsCollapsed} savedState={allNegativeAccountsSaved} totalCount={accounts.length} warningCount={unsavedNegativeAccounts.length} onToggle={toggleCreditAccounts} />
          ) : (
            <Card className="border-[2px] border-gray-300 rounded-lg bg-white shadow-sm">
              <CardHeader
                className="cursor-pointer transition-colors duration-200 flex items-center p-6 bg-white hover:bg-gray-50"
                onClick={toggleCreditAccounts}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gray-500">
                        {accounts.length}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-700">
                        Credit Accounts
                      </h3>
                      <p className="text-sm text-gray-600">
                        {accounts.length} credit accounts in good standing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">
                      {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
                    </span>
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4 px-4">
                <div className="min-h-0 flex flex-col">
                {/* Positive & Closed Accounts Nested Section */}
                <PositiveClosedAccountsSection
                  positiveAccounts={positiveAccounts}
                  aiViolations={aiViolations}
                  disputeReasons={disputeReasons}
                  disputeInstructions={disputeInstructions}
                  onDisputeSaved={handleDisputeSaved}
                  onDisputeReset={handleDisputeReset}
                  aiScanCompleted={aiScanCompleted}
                  savedDisputes={savedDisputes}
                  showPositiveAccounts={showPositiveAccounts}
                  setShowPositiveAccounts={setShowPositiveAccounts}
                  expandAll={expandAll}
                  setExpandAll={setExpandAll}
                  showAllDetails={showAllDetails}
                  setShowAllDetails={setShowAllDetails}
                  onExpand={() => {/* Removed scrollToSectionOnExpand to prevent auto-scroll loop */}}
                  onAccountExpand={(accountId) => {/* Removed scrollToSectionOnExpand to prevent auto-scroll loop */}}
                />

                {/* Negative Accounts Nested Section */}
                <div ref={negativeAccountsRef} data-section="negative-accounts">
                  <NegativeAccountsSection
                    negativeAccountsRef={negativeAccountsRef}
                    negativeAccounts={negativeAccounts}
                  aiViolations={aiViolations}
                  disputeReasons={disputeReasons}
                  disputeInstructions={disputeInstructions}
                  onDisputeSaved={handleDisputeSaved}
                  onDisputeReset={handleDisputeReset}
                  aiScanCompleted={aiScanCompleted}
                  savedDisputes={savedDisputes}
                  showNegativeAccounts={showNegativeAccounts}
                  setShowNegativeAccounts={setShowNegativeAccounts}
                  expandAll={expandAll}
                  setExpandAll={setExpandAll}
                  onExpand={() => {/* Removed scrollToSectionOnExpand to prevent auto-scroll loop */}}
                  onCreditAccountsCollapse={handleCreditAccountsCollapse}
                  />
                </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>



        {/* Public Records Section */}
        <div data-section="public-records" ref={publicRecordsRef}>
          <PublicRecordsSection
            publicRecords={publicRecords}
            hasPublicRecords={hasPublicRecords}
            savedDisputes={savedDisputes}
            handleDisputeSaved={handleDisputeSaved}
            handleDisputeReset={handleDisputeReset}
            expandAll={expandAll}
            aiViolations={aiViolations}
            aiSuggestions={aiSuggestions}
            aiScanCompleted={aiScanCompleted}
            publicRecordsRef={publicRecordsRef}
            onExpand={() => {
              // Auto-scroll to Public Records section on expand
              const publicRecordsSection = document.querySelector('[data-section="public-records"]') as HTMLElement;
              if (publicRecordsSection) {
                const elementTop = publicRecordsSection.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementTop - 20;
                
                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                });
              }
            }}
          />
        </div>

        {/* Completion Center */}
        <div className="mb-12 mt-12">
          <CompletionCenter
            onContinueToWizard={handleContinueToWizard}
            onShowDisputeItems={handleShowDisputeItems}
          />
        </div>

        <DisputeModal
          isOpen={isDisputeModalOpen}
          onClose={() => setIsDisputeModalOpen(false)}
          accounts={accounts}
          selectedAccount={null}
        />
      </div>
    </div>
  );
  
  // Application loaded successfully
}

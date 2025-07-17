import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ThickCheckIcon } from '@/components/ui/thick-check-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SavedCollapsedCard } from '@/components/ui/saved-collapsed-card';
// Removed useSmoothScrollToNextCard hook to prevent continuous auto-scrolling interference
import { DerogatoryImpactChart } from './derogatory-impact-chart';

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface CreditSummaryProps {
  creditData: any;
  isReviewSaved?: boolean;
  onReviewSaved?: () => void;
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
  onExpand?: () => void;
  onReviewReset?: () => void;
}

interface BureauSummary {
  totalAccounts: number;
  openAccounts: number;
  closedAccounts: number;
  delinquent: number;
  derogatory: number;
  collection: number;
  balances: number;
  payments: number;
  publicRecords: number;
  inquiries2Years: number;
}

export function CreditSummary({ 
  creditData, 
  isReviewSaved = false, 
  onReviewSaved,
  isExpanded = false,
  setIsExpanded,
  onExpand,
  onReviewReset
}: CreditSummaryProps) {
  // Removed scrollToNext hook to prevent continuous auto-scrolling interference
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [isCreditSummaryChoreographyActive, setIsCreditSummaryChoreographyActive] = useState(false);
  const [hasCreditSummaryChoreographed, setHasCreditSummaryChoreographed] = useState(false);

  // Helper function for smooth scrolling to sections
  const smoothScrollToSection = (sectionId: string, offset: number = 20) => {
    const element = document.querySelector(`[data-section="${sectionId}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetScrollTop = scrollTop + rect.top - offset;
      
      window.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  };

  // Complete save logic function for both initial save and re-trigger
  const executeCreditSummarySaveLogic = () => {
    console.log("Executing Credit Summary save logic with choreography");
    
    // If this is a re-trigger, first reset the parent state
    if (isReviewSaved) {
      console.log("Re-triggering: Resetting parent state first");
      onReviewReset?.();
      
      // Then trigger the save after a brief delay
      setTimeout(() => {
        onReviewSaved?.();
      }, 50);
    } else {
      // Call the onReviewSaved callback to update parent state
      onReviewSaved?.();
    }
    
    // The useEffect will handle the choreography when isReviewSaved becomes true
  };

  // Credit Summary Save Choreography
  useEffect(() => {
    if (isReviewSaved && !hasCreditSummaryChoreographed) {
      setHasCreditSummaryChoreographed(true);
      setIsCreditSummaryChoreographyActive(true);

      console.log("Step 1: Credit Summary Marked Saved");
      smoothScrollToSection("credit-summary", 20);

      setTimeout(() => {
        setIsExpanded?.(false);
        console.log("Step 2: Credit Summary Collapsed");

        setTimeout(() => {
          smoothScrollToSection("personal-info", 20);
          console.log("Step 3: Scrolled to Personal Information");

          setTimeout(() => {
            setIsCreditSummaryChoreographyActive(false);
            console.log("Credit Summary Choreography Complete");
          }, 100);
        }, 300);
      }, 300);
    }
    
    // Reset choreography flag when isReviewSaved becomes false
    if (!isReviewSaved) {
      setHasCreditSummaryChoreographed(false);
    }
  }, [isReviewSaved]);

  if (!creditData?.CREDIT_RESPONSE) {
    return (
      <div className="mb-8">
        <div className="mb-6">
          <p className="text-gray-600">Unable to load credit summary data</p>
        </div>
      </div>
    );
  }

  function getBureauDataByKey(account: any, key: 'TU' | 'EQ' | 'EX') {
    const balance = account.BalanceAmount || 0;
    const status = account.AccountStatusCode || 'Unknown';

    const hasData = balance > 0 || status !== 'Unknown';

    return {
      reporting: hasData,
      balance,
      statusCode: status
    };
  }

  const calculateBureauSummary = (bureauName: string): BureauSummary => {
    const accounts = creditData?.CREDIT_RESPONSE?.CREDIT_LIABILITY || [];
    const inquiries = creditData?.CREDIT_RESPONSE?.CREDIT_INQUIRY || [];
    const publicRecords = creditData?.CREDIT_RESPONSE?.CREDIT_PUBLIC_RECORD || [];

    // Map bureau names to codes
    const bureauCode = bureauName === 'TransUnion' ? 'TU' : bureauName === 'Equifax' ? 'EQ' : 'EX';
    // Filter accounts that report to this bureau using unified structure
    const bureauAccounts = accounts.filter((account: any) => {
      const bureauData = getBureauDataByKey(account, bureauCode);
      return bureauData.reporting;
    });

    // Filter inquiries by bureau (last 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const bureauInquiries = inquiries.filter((inquiry: any) => {
      const inquiryDate = new Date(inquiry['@_Date'] || '');
      const isFromBureau = inquiry.CREDIT_REPOSITORY?.['@_SourceType'] === bureauName;
      return isFromBureau && inquiryDate > twoYearsAgo;
    });

    // Filter public records by bureau
    const bureauPublicRecords = publicRecords.filter((record: any) => {
      if (Array.isArray(record.CREDIT_REPOSITORY)) {
        return record.CREDIT_REPOSITORY.some((repo: any) => repo['@_SourceType'] === bureauName);
      }
      return record.CREDIT_REPOSITORY?.['@_SourceType'] === bureauName;
    });

    // Calculate metrics with more accurate data parsing
    const totalAccounts = bureauAccounts.length;

    const openAccounts = bureauAccounts.filter(
      (acc: any) =>
        acc['@_AccountStatusType'] === 'Open' ||
        (acc.AccountOpenedDate && !acc['@_AccountClosedDate'])
    ).length;

    const closedAccounts = bureauAccounts.filter(
      (acc: any) =>
        acc['@_AccountStatusType'] === 'Closed' ||
        acc['@_AccountClosedDate'] ||
        acc['@IsClosedIndicator'] === 'Y'
    ).length;

    const delinquent = bureauAccounts.filter(
      (acc: any) =>
        acc['@_DerogatoryDataIndicator'] === 'Y' ||
        acc['@DerogatoryDataIndicator'] === 'Y' ||
        acc['@_AccountType'] === 'Collection' ||
        acc['@AccountType'] === 'Collection'
    ).length;

    const derogatory = bureauAccounts.filter(
      (acc: any) =>
        acc['@_DerogatoryDataIndicator'] === 'Y' || acc['@DerogatoryDataIndicator'] === 'Y'
    ).length;

    const collection = bureauAccounts.filter(
      (acc: any) => acc['@_AccountType'] === 'Collection' || acc['@AccountType'] === 'Collection'
    ).length;

    const balances = bureauAccounts.reduce((sum: number, acc: any) => {
      const balance = parseFloat(
        acc['@_CurrentBalance'] || acc['@CurrentBalance'] || acc.BalanceAmount || '0'
      );
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);

    const payments = bureauAccounts.reduce((sum: number, acc: any) => {
      const payment = parseFloat(
        acc['@_MonthlyPaymentAmount'] || acc['@MonthlyPaymentAmount'] || '0'
      );
      return sum + (isNaN(payment) ? 0 : payment);
    }, 0);

    return {
      totalAccounts,
      openAccounts,
      closedAccounts,
      delinquent,
      derogatory,
      collection,
      balances,
      payments,
      publicRecords: bureauPublicRecords.length,
      inquiries2Years: bureauInquiries.length,
    };
  };

  const transUnionSummary = calculateBureauSummary('TransUnion');
  const equifaxSummary = calculateBureauSummary('Equifax');
  const experianSummary = calculateBureauSummary('Experian');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(amount);
  };

  const MinimalBureauColumn = ({
    title,
    summary,
    logoColor,
  }: {
    title: string;
    summary: BureauSummary;
    logoColor: string;
  }) => (
    <div className="flex-1">
      <div className="mb-3">
        <h3 className={`font-bold ${isReviewSaved ? 'text-green-700' : logoColor} text-left`}>{title}</h3>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Total Accounts:</span>
            <span className="text-sm font-bold">{summary.totalAccounts}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Open Accounts:</span>
            <span className="text-sm font-bold">{summary.openAccounts}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Derogatory:</span>
            <span
              className={`text-sm font-bold ${summary.derogatory > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.derogatory}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Public Records:</span>
            <span
              className={`text-sm font-bold ${summary.publicRecords > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.publicRecords}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const FullBureauColumn = ({
    title,
    summary,
    logoColor,
  }: {
    title: string;
    summary: BureauSummary;
    logoColor: string;
  }) => (
    <div className="flex-1">
      <div className="mb-3">
        <h3 className={`font-bold ${isReviewSaved ? 'text-green-700' : logoColor} text-left`}>{title}</h3>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Total Accounts:</span>
            <span className="text-sm font-bold">{summary.totalAccounts}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Open Accounts:</span>
            <span className="text-sm font-bold">{summary.openAccounts}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Closed Accounts:</span>
            <span className="text-sm font-bold">{summary.closedAccounts}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Delinquent:</span>
            <span
              className={`text-sm font-bold ${summary.delinquent > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.delinquent}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Derogatory:</span>
            <span
              className={`text-sm font-bold ${summary.derogatory > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.derogatory}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Collection:</span>
            <span
              className={`text-sm font-bold ${summary.collection > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.collection}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Balances:</span>
            <span className="text-sm font-bold">{formatCurrency(summary.balances)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Payments:</span>
            <span className="text-sm font-bold">{formatCurrency(summary.payments)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Public Records:</span>
            <span
              className={`text-sm font-bold ${summary.publicRecords > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.publicRecords}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm md:text-xs text-gray-600">Inquiries(2 Years):</span>
            <span
              className={`text-sm font-bold ${summary.inquiries2Years > 5 ? 'text-red-600' : summary.inquiries2Years > 2 ? 'text-yellow-600' : 'text-green-600'}`}
            >
              {summary.inquiries2Years}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // If saved and not expanded, show collapsed card
  if (isReviewSaved && !isExpanded) {
    return (
      <SavedCollapsedCard
        sectionName="Credit Summary"
        successMessage="Credit Summary – Review Saved"
        summaryText="You've completed reviewing the credit summary and score impact data."
        onExpand={() => {
          // Block manual toggles during choreography
          if (isCreditSummaryChoreographyActive) {
            return;
          }
          
          console.log("Credit Summary header clicked — scrolling to credit-summary");
          
          // Scroll to Credit Summary section with 20px offset
          smoothScrollToSection("credit-summary", 20);
          
          setIsExpanded?.(true);
          onExpand?.();
        }}
      />
    );
  }

  return (
    <Card className={`overflow-hidden ${isReviewSaved ? 'bg-green-50 border-[2px] border-green-500' : isExpanded ? 'bg-white border-[2px] border-gray-300' : 'bg-white border-[2px] border-gray-200'}`}>
      <CardHeader 
        className={`cursor-pointer flex flex-row items-center p-6 ${isReviewSaved ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-gray-50 hover:shadow-lg'} transition-all duration-200`}
        onClick={() => {
          // Block manual toggles during choreography
          if (isCreditSummaryChoreographyActive) {
            return;
          }
          
          console.log("Credit Summary header clicked — scrolling to credit-summary");
          
          // Scroll to Credit Summary section with 20px offset
          smoothScrollToSection("credit-summary", 20);
          
          const newExpanded = !isExpanded;
          setIsExpanded?.(newExpanded);
          
          // Call the centralized scroll function when expanding
          if (newExpanded) {
            onExpand?.();
          }
        }}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
              isReviewSaved ? 'bg-green-600' : 'bg-gray-500'
            }`}>
              {isReviewSaved ? <ThickCheckIcon className="w-4 h-4" /> : 'CS'}
            </div>
            <div>
              <h3 className={`text-lg font-bold ${isReviewSaved ? 'text-green-700' : 'text-gray-900'}`}>
                {isReviewSaved ? 'Credit Summary – Review Saved' : 'Credit Summary'}
              </h3>
              <p className={`text-sm ${isReviewSaved ? 'text-green-700' : 'text-gray-600'}`}>
                {isReviewSaved 
                  ? "You've completed reviewing the credit summary and score impact data."
                  : "Summary of credit accounts, balances, and score impact."
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-sm ${isReviewSaved ? 'text-green-700' : 'text-gray-600'}`}>3 Bureaus</span>
            {isExpanded ? <ChevronUp className={`w-4 h-4 ${isReviewSaved ? 'text-green-700' : 'text-gray-600'}`} /> : <ChevronDown className={`w-4 h-4 ${isReviewSaved ? 'text-green-700' : 'text-gray-600'}`} />}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className={`rounded-b-lg ${isReviewSaved ? 'bg-green-50' : 'bg-white'}`}>
          <div className={`relative pt-0 pb-0 px-6`}>
            {/* Invisible minimize button when expanded */}
            {showFullSummary && (
              <button
                onClick={() => {
                  setShowFullSummary(false);
                  // Removed scrollToNext call to prevent continuous auto-scrolling interference
                }}
                className="absolute inset-x-0 top-0 h-6 w-full bg-transparent hover:bg-gray-50/20 transition-colors duration-200 cursor-pointer z-10"
                aria-label="Minimize Credit Summary"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {showFullSummary ? (
                  <>
                    <FullBureauColumn
                      title="TransUnion"
                      summary={transUnionSummary}
                      logoColor="text-cyan-700"
                    />
                    <FullBureauColumn
                      title="Equifax"
                      summary={equifaxSummary}
                      logoColor="text-red-700"
                    />
                    <FullBureauColumn
                      title="Experian"
                      summary={experianSummary}
                      logoColor="text-blue-800"
                    />
                  </>
                ) : (
                  <>
                    <MinimalBureauColumn
                      title="TransUnion"
                      summary={transUnionSummary}
                      logoColor="text-cyan-700"
                    />
                    <MinimalBureauColumn
                      title="Equifax"
                      summary={equifaxSummary}
                      logoColor="text-red-700"
                    />
                    <MinimalBureauColumn
                      title="Experian"
                      summary={experianSummary}
                      logoColor="text-blue-800"
                    />
                  </>
                )}
              </div>

              {/* Derogatory Impact Analysis - Only show when expanded */}
              {showFullSummary && (
                <div className="mt-6">
                  <DerogatoryImpactChart creditData={creditData} />
                </div>
              )}

              {/* Save Button - positioned at bottom, below Score Impact box, above divider */}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => {
                    console.log("Save button clicked — triggering choreography regardless of isReviewSaved");
                    
                    // If already saved, trigger re-save choreography by resetting flags
                    if (isReviewSaved) {
                      console.log('GREEN SAVE BUTTON CLICKED - Triggering re-save choreography');
                      
                      // Reset local choreography flag and trigger re-save
                      setHasCreditSummaryChoreographed(false);
                      
                      // Call the complete save logic function
                      executeCreditSummarySaveLogic();
                      return;
                    }
                    
                    // Trigger save immediately using the same logic
                    executeCreditSummarySaveLogic();
                  }}
                  className={`${
                    isReviewSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white px-4 py-2 rounded-md disabled:bg-gray-400 transition-colors duration-200 w-[190px] h-10 flex items-center justify-center`}
                >
                  {isReviewSaved ? (
                    <>
                      <ThickCheckIcon className="w-4 h-4 text-white mr-2" />
                      <span className="hidden md:inline">Review Saved</span>
                      <span className="md:hidden">Saved</span>
                    </>
                  ) : (
                    'Complete Review'
                  )}
                </Button>
              </div>

              {/* Show More / Show Less Button */}
              <div className="mt-4 pt-2 pb-0 mb-0 border-t border-gray-200">
                {/* Show More / Show Less toggle – centered */}
                <div className="flex justify-center mt-2 mb-0">
                  <button
                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
                    onClick={() => {
                      const newShowFullSummary = !showFullSummary;
                      setShowFullSummary(newShowFullSummary);

                      // Removed scrollToNext call to prevent continuous auto-scrolling interference
                    }}
                  >
                    {showFullSummary ? 'Show Less' : 'Show More'}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        showFullSummary ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
  );
}

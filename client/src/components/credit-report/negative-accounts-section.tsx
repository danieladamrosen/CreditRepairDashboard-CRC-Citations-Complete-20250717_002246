import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { ThickCheckIcon } from '@/components/ui/thick-check-icon';
import { AccountRow } from './account-row';
import { cn } from '@/lib/utils';

interface NegativeAccountsSectionProps {
  negativeAccounts: any[];
  aiViolations: { [accountId: string]: string[] };
  disputeReasons: any;
  disputeInstructions: any;
  onDisputeSaved: (accountId: string, disputeData: any) => void;
  onDisputeReset: (accountId: string) => void;
  aiScanCompleted: boolean;
  savedDisputes: {
    [accountId: string]: boolean | { reason: string; instruction: string; violations?: string[] };
  };
  showNegativeAccounts: boolean;
  setShowNegativeAccounts: (show: boolean) => void;
  expandAll: boolean;
  setExpandAll: (expand: boolean) => void;
  onExpand?: () => void;
  onCreditAccountsCollapse?: () => void;
  negativeAccountsRef?: React.RefObject<HTMLDivElement>;
}

export function NegativeAccountsSection({
  negativeAccounts,
  aiViolations,
  disputeReasons,
  disputeInstructions,
  onDisputeSaved,
  onDisputeReset,
  aiScanCompleted,
  savedDisputes,
  showNegativeAccounts,
  setShowNegativeAccounts,
  expandAll,
  setExpandAll,
  onExpand,
  onCreditAccountsCollapse,
  negativeAccountsRef,
}: NegativeAccountsSectionProps) {
  console.log("🎯 NegativeAccountsSection received:", negativeAccounts?.length || 0, "negative accounts");
  const [negativeAccountsCollapsed, setNegativeAccountsCollapsed] = useState(true);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Compute summary text for saved disputes
  const totalSavedDisputes = negativeAccounts.filter((account: any) => {
    const accountId =
      account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
    return savedDisputes[accountId];
  }).length;
  const summaryText = `You've saved disputes for ${totalSavedDisputes} negative account(s) across TransUnion, Equifax, and Experian.`;

  // Check if all negative accounts have saved disputes
  const allNegativeAccountsSaved =
    negativeAccounts.length > 0 &&
    negativeAccounts.every((account: any) => {
      const accountId =
        account['@CreditLiabilityID'] ||
        account['@_AccountNumber'] ||
        account['@_AccountIdentifier'];
      return savedDisputes[accountId];
    });

  // Calculate unsaved negative accounts count for real-time updates
  const unsavedNegativeAccountsCount = negativeAccounts.filter((account: any) => {
    const accountId =
      account['@CreditLiabilityID'] ||
      account['@_AccountNumber'] ||
      account['@_AccountIdentifier'];
    return !savedDisputes[accountId];
  }).length;

  // Console logging for debugging
  console.log(`🔴 Negative Accounts count update: ${unsavedNegativeAccountsCount} unsaved out of ${negativeAccounts.length} total`);
  console.log(`🔴 Saved disputes:`, Object.keys(savedDisputes).filter(key => savedDisputes[key]).length, 'total saved');

  // Additional detailed logging
  negativeAccounts.forEach((account: any, index: number) => {
    const accountId = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
    const creditorName = account._CREDITOR?.['@_Name'] || 'Unknown';
    const isSaved = !!savedDisputes[accountId];
    console.log(`🔴 Account ${index + 1}: ${creditorName} (${accountId}) - ${isSaved ? 'SAVED' : 'UNSAVED'}`);
  });

  // Handle toggle for both states
  const handleToggle = () => {
    if (negativeAccountsCollapsed) {
      handleExpandClick();
    } else {
      setNegativeAccountsCollapsed(true);
      setShowNegativeAccounts(false);
    }
  };

  // Handle expand with scroll
  let negativeAccountsScrollTimer: ReturnType<typeof setTimeout> | null = null;

  function handleExpandClick() {
    console.log("Negative Accounts header clicked — expanding and scrolling");
    setNegativeAccountsCollapsed(false);
    setShowNegativeAccounts(true);
    if (negativeAccountsScrollTimer) clearTimeout(negativeAccountsScrollTimer);
    negativeAccountsScrollTimer = setTimeout(() => {
      if (typeof window === "undefined" || !negativeAccountsRef?.current) return;
      setTimeout(() => {
        const rect = negativeAccountsRef.current!.getBoundingClientRect();
        console.log("✅ Scrolling via window.scrollTo:", rect.top);
        window.scrollTo({ top: window.scrollY + rect.top - 20, behavior: "smooth" });
      }, 0);
    }, 400);
  }

  // Custom onDisputeSaved handler with scroll behavior
  const handleDisputeSaved = (accountId: string, disputeData: any) => {
    console.log("Negative Account saved — collapsing item");
    
    // Call the original onDisputeSaved
    onDisputeSaved(accountId, disputeData);
    
    // Determine if this is the last negative account
    const currentIndex = negativeAccounts.findIndex((account: any) => {
      const id = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return id === accountId;
    });
    
    // Check how many negative accounts still need saving (excluding the one we just saved)
    const unsavedCount = negativeAccounts.filter((account: any, index: number) => {
      if (index === currentIndex) return false; // Exclude the current account we just saved
      const id = account['@CreditLiabilityID'] || account['@_AccountNumber'] || account['@_AccountIdentifier'];
      return !savedDisputes[id];
    }).length;
    
    const isLastNegativeAccount = unsavedCount === 0;
    
    if (isLastNegativeAccount) {
      // FINAL APPROVED 9-STEP CHOREOGRAPHY FOR LAST NEGATIVE ACCOUNT (Step 7 removed)
      console.log("1️⃣ Save → Account turns green immediately");
      
      // Step 2: Immediately scroll to 20px above Credit Accounts section
      setTimeout(() => {
        console.log("2️⃣ Immediately scroll to 20px above Credit Accounts section");
        const creditAccountsSection = document.querySelector('[data-section="credit-accounts"]') as HTMLElement;
        if (creditAccountsSection) {
          const elementTop = creditAccountsSection.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementTop - 20;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
        
        // Step 3: Pause 500ms
        setTimeout(() => {
          console.log("3️⃣ Pause 500ms");
          
          // Step 4: Collapse just that last Negative Account card in place
          setTimeout(() => {
            console.log("4️⃣ Collapse just that last Negative Account card in place");
            // The account row handles its own collapse animation
            
            // Step 5: REMOVED - No pause
            // Step 6: Collapse all collapsed Negative Accounts into main card (IMMEDIATE)
            console.log("6️⃣ Collapse all collapsed Negative Accounts into main card (green with success message)");
            setShowNegativeAccounts(false); // This collapses the entire section
            
            // Step 7: Collapse Credit Accounts section and turn it green (NO PAUSE - Step 7 removed)
            console.log("7️⃣ Collapse Credit Accounts section and turn it green with success message");
            if (onCreditAccountsCollapse) {
              onCreditAccountsCollapse(); // This should collapse and turn green
            }
            
            // Step 8: Pause 500ms
            setTimeout(() => {
              console.log("8️⃣ Pause 500ms");
              
              // Step 9: Scroll to 20px above Public Records section
              setTimeout(() => {
                console.log("9️⃣ Scroll to 20px above Public Records section");
                const publicRecordsSection = document.querySelector('[data-section="public-records"]') as HTMLElement;
                if (publicRecordsSection) {
                  const elementTop = publicRecordsSection.getBoundingClientRect().top + window.scrollY;
                  const offsetPosition = elementTop - 20;
                  
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                  });
                }
              }, 500);
            }, 500);
          }, 500);
        }, 500);
      }, 100); // Small delay to ensure immediate scroll
      
    } else {
      // NORMAL BEHAVIOR FOR NON-LAST NEGATIVE ACCOUNTS
      // Wait for the account row collapse animation to complete, then scroll to next card
      setTimeout(() => {
        if (currentIndex !== -1 && currentIndex < negativeAccounts.length - 1) {
          // Get the next account
          const nextAccount = negativeAccounts[currentIndex + 1];
          const nextAccountId = nextAccount['@CreditLiabilityID'] || nextAccount['@_AccountNumber'] || nextAccount['@_AccountIdentifier'];
          
          // Find the next card element using the account ID
          const nextCardElement = document.querySelector(`[data-account-id="${nextAccountId}"]`) as HTMLElement;
          
          if (nextCardElement) {
            console.log("Scrolling to next Negative Account card");
            const elementTop = nextCardElement.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementTop - 20;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          } else {
            console.log("Next card element not found for account ID:", nextAccountId);
          }
        } else {
          console.log("No next card — scroll skipped");
        }
      }, 1000); // Wait 1000ms to allow account row collapse animation to complete, then scroll
    }
  };

  return (
    <div data-section="negative-accounts">
      {negativeAccountsCollapsed ? (
        <Card
          className={`cursor-pointer transition-all duration-300 hover:shadow-lg overflow-hidden ${
            allNegativeAccountsSaved
              ? 'bg-green-50 border-[2px] border-green-500'
              : 'border-[2px] border-red-500 bg-rose-50'
          }`}
          onClick={() => {
            console.log("Negative Accounts header clicked — scrolling to negative-accounts");
            
            // Smooth scroll to Negative Accounts section
            const negativeAccountsSection = document.querySelector('[data-section="negative-accounts"]') as HTMLElement;
            if (negativeAccountsSection) {
              const elementTop = negativeAccountsSection.getBoundingClientRect().top + window.scrollY;
              const offsetPosition = elementTop - 20;
              
              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
            } else {
              console.warn("Negative Accounts section with data-section='negative-accounts' not found");
            }
            
            // Then handle toggle
            handleToggle();
          }}
        >
          <CardHeader
            className={
              allNegativeAccountsSaved
                ? 'cursor-pointer flex flex-row items-center p-6 bg-green-50 hover:bg-green-100 transition-colors duration-200'
                : 'cursor-pointer flex flex-row items-center p-6 bg-rose-50 hover:bg-red-100 transition-colors duration-200'
            }
          >
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center ${
                    allNegativeAccountsSaved ? 'bg-green-600' : 'bg-red-600'
                  }`}
                >
                  {allNegativeAccountsSaved ? (
                    <ThickCheckIcon className="w-4 h-4" />
                  ) : (
                    unsavedNegativeAccountsCount
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <h3
                    className={`text-lg font-bold ${
                      allNegativeAccountsSaved ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {allNegativeAccountsSaved
                      ? 'Negative Accounts – Disputes Saved'
                      : 'Negative Accounts'}
                  </h3>
                  <p
                    className={`text-sm flex items-center gap-1 ${
                      allNegativeAccountsSaved ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {allNegativeAccountsSaved ? (
                      <span>{summaryText}</span>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        {unsavedNegativeAccountsCount} negative accounts need dispute review
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm ${allNegativeAccountsSaved ? 'text-green-700' : 'text-red-700'}`}
                >
                  {negativeAccounts.length} accounts
                </span>
                <ChevronDown
                  className={`h-5 w-5 ${allNegativeAccountsSaved ? 'text-green-700' : 'text-red-700'}`}
                />
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card
          className="overflow-hidden transition-all duration-300 hover:shadow-lg border-[2px] border-gray-300 bg-white shadow-sm"
        >
          <CardHeader
            onClick={() => {
              console.log("Negative Accounts header clicked — scrolling to negative-accounts");
              
              // Smooth scroll to Negative Accounts section
              const negativeAccountsSection = document.querySelector('[data-section="negative-accounts"]') as HTMLElement;
              if (negativeAccountsSection) {
                const elementTop = negativeAccountsSection.getBoundingClientRect().top + window.scrollY;
                const offsetPosition = elementTop - 20;
                
                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                });
              } else {
                console.warn("Negative Accounts section with data-section='negative-accounts' not found");
              }
              
              // Then handle toggle
              handleToggle();
            }}
            className="flex flex-row items-center justify-between p-6 cursor-pointer hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center ${allNegativeAccountsSaved ? 'bg-green-500' : 'bg-red-500'}`}
              >
                {allNegativeAccountsSaved ? (
                  <ThickCheckIcon className="w-4 h-4" />
                ) : (
                  unsavedNegativeAccountsCount
                )}
              </div>
              <div>
                <h3
                  className={`text-lg font-bold m-0 ${allNegativeAccountsSaved ? 'text-green-700' : 'text-red-700'}`}
                >
                  {allNegativeAccountsSaved
                    ? 'Negative Accounts – Disputes Saved'
                    : 'Negative Accounts'}
                </h3>
                <p
                  className={`flex flex-row items-center gap-2 text-sm m-0 ${allNegativeAccountsSaved ? 'text-green-600' : 'text-red-600'}`}
                >
                  {allNegativeAccountsSaved ? (
                    <span>{summaryText}</span>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" /> {unsavedNegativeAccountsCount} negative
                      accounts need dispute review
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-2">
              <span
                className={`text-sm ${allNegativeAccountsSaved ? 'text-green-600' : 'text-red-600'}`}
              >
                {negativeAccounts.length} accounts
              </span>
              <ChevronUp
                className={`h-5 w-5 ${allNegativeAccountsSaved ? 'text-green-600' : 'text-red-600'}`}
              />
            </div>
          </CardHeader>

          <CardContent className="px-6 pt-2 pb-6 flex flex-col gap-6 bg-white">
            {showNegativeAccounts &&
              negativeAccounts.map((account: any, index: number) => {
                const accountId =
                  account['@CreditLiabilityID'] ||
                  account['@_AccountNumber'] ||
                  account['@_AccountIdentifier'];
                
                // ✅ STEP 2 VERIFICATION: Log each account being rendered
                console.log("Rendering account row:", {
                  accountId,
                  creditorName: account._CREDITOR?.['@_Name'] || 'Unknown',
                  accountType: account['@_AccountType'] || 'Unknown',
                  derogatory: account['@_DerogatoryDataIndicator'] || 'N',
                  index: index + 1,
                  totalNegativeAccounts: negativeAccounts.length
                });
                
                return (
                  <AccountRow
                    key={`negative-${accountId || index}`}
                    account={account}
                    aiViolations={aiViolations[account['@CreditLiabilityID']] || []}
                    metro2Violations={[]}
                    fcrFdcpaViolations={[]}
                    disputeReasons={disputeReasons}
                    disputeInstructions={disputeInstructions}
                    onDisputeSaved={handleDisputeSaved}
                    onDisputeReset={onDisputeReset}
                    expandAll={expandAll}
                    showAllDetails={showAllDetails}
                    aiScanCompleted={aiScanCompleted}
                    savedDisputes={savedDisputes}
                    isFirstInConnectedSection={index === 0}
                    allNegativeAccountsSaved={negativeAccounts.every(
                      (acc: any) =>
                        savedDisputes[
                          acc['@CreditLiabilityID'] ||
                            acc['@_AccountNumber'] ||
                            acc['@_AccountIdentifier']
                        ]
                    )}
                  />
                );
              })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

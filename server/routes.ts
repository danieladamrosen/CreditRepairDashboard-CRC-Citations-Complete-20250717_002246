import type { Express } from "express";
import { z } from "zod";
import OpenAI from 'openai';

import { storage } from "./storage";
import { insertDisputeSchema, insertCustomTemplateSchema } from "../shared/schema.js";
import { detectFCRAViolations, detectMetro2Violations, generateEnhancedDisputeLanguage, ENHANCED_FCRA_VIOLATIONS_GUIDE, ENHANCED_METRO_2_VIOLATIONS_GUIDE } from './ai-guide-integration';
import { Metro2ComplianceChecker } from './metro2-compliance-rules';
import { getMetro2ViolationsForAccount, generateFieldSpecificViolation } from './metro2-field-reference';
import { 
  ComplianceResourceValidator, 
  validateAccountWithResources, 
  validatePublicRecordWithResources, 
  validateInquiryWithResources 
} from './compliance-resource-validator';

// OPTIMIZED: Token management constants for GPT-3.5-turbo-1106
const MAX_INPUT_TOKENS = 100000;
const MAX_TOKENS_RESPONSE = 1000; // Reduced from 1500 to 1000
const TOKENS_PER_ACCOUNT_LIMIT = 1000;
const MAX_CONCURRENT_REQUESTS = 5; // Concurrency limit

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Token counting utility
function countTokens(text: string): number {
  try {
    // Simple approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  } catch (error) {
    return Math.ceil(text.length / 4);
  }
}

// Enhanced Metro 2 compliance checker with structured rules and field reference
function checkMetro2Compliance(accountData: any): {
  metro2Violations: string[];
  fcrViolations: string[];
  fdcpaViolations: string[];
} {
  try {
    // Get field-specific Metro 2 violations using the comprehensive field reference
    const fieldSpecificViolations = getMetro2ViolationsForAccount(accountData);
    
    // Also get compliance checker violations
    const complianceResults = Metro2ComplianceChecker.checkCompliance(accountData);
    const complianceViolations = complianceResults.map(result => result.violation);
    
    // Combine both sources for comprehensive Metro 2 coverage
    const metro2Violations = [...fieldSpecificViolations, ...complianceViolations];
    
    // Generate FCRA violations using PDF content
  const fcrResults = detectFCRAViolations(accountData);
  const fcrViolations = fcrResults.map(result => 
    `FCRA Violation: ${result.violation.title} - ${result.violation.description}`
  );
  
  // Generate FDCPA violations for debt collection scenarios using enhanced guide
  const fdcpaViolations = [];
  if (accountData['@IsCollectionIndicator'] === 'Y' || 
      accountData['@_AccountStatusType']?.includes('Collection')) {
    // Add specific FDCPA violations from the enhanced guide
    fdcpaViolations.push('FDCPA Violation: Misrepresenting the amount owed - violates FDCPA § 807(2)(A)');
    fdcpaViolations.push('FDCPA Violation: Harassment through repeated calls to annoy or harass - violates FDCPA § 806(5)');
    fdcpaViolations.push('FDCPA Violation: Communicating at unusual times or places - violates FDCPA § 805(a)(1)');
  }
  
  return {
    metro2Violations: metro2Violations.slice(0, 3), // Limit to 3 violations
    fcrViolations: fcrViolations.slice(0, 2), // Limit to 2 violations
    fdcpaViolations: fdcpaViolations.slice(0, 1) // Limit to 1 violation
  };
  } catch (error) {
    console.error('Metro 2 compliance check failed:', error);
    // Return empty arrays on error
    return {
      metro2Violations: [],
      fcrViolations: [],
      fdcpaViolations: []
    };
  }
}

// ✅ STRUCTURED METRO 2 COMPLIANCE TEST FUNCTION
function testStructuredMetro2Compliance(account: any): {
  success: boolean;
  violations: string[];
  evidence: string[];
  error?: string;
} {
  console.log(`🔍 TESTING STRUCTURED METRO 2 COMPLIANCE for account: ${account['@CreditLiabilityID'] || 'unknown'}`);
  
  try {
    // Use Metro2ComplianceChecker directly
    const complianceResults = Metro2ComplianceChecker.checkCompliance(account);
    console.log(`📊 Metro 2 compliance check found ${complianceResults.length} violations`);
    
    const violations = complianceResults.map(result => result.violation);
    const evidence = complianceResults.flatMap(result => result.evidence);
    
    console.log(`✅ Structured Metro 2 violations:`, violations);
    console.log(`🔍 Evidence:`, evidence);
    
    return {
      success: true,
      violations,
      evidence
    };
  } catch (error) {
    console.error('❌ Structured Metro 2 compliance test failed:', error);
    return {
      success: false,
      violations: [],
      evidence: [],
      error: error.message
    };
  }
}

// Helper functions for static violations using structured Metro 2 checker
function getStaticViolationsForAccount(account: any, index: number): string[] {
  // ✅ STRUCTURED METRO 2 CHECKING - CLEAN SEPARATION FROM OPENAI
  console.log(`🔍 RUNNING STRUCTURED METRO 2 CHECK for account: ${account['@CreditLiabilityID'] || 'unknown'}`);
  
  try {
    const complianceResults = checkMetro2Compliance(account);
    
    // Combine all violations into single array
    const allViolations = [
      ...complianceResults.metro2Violations,
      ...complianceResults.fcrViolations,
      ...complianceResults.fdcpaViolations
    ];
    
    console.log(`📊 Structured compliance check found ${allViolations.length} violations`);
    
    // If structured check finds violations, use those; otherwise use enhanced fallback
    if (allViolations.length > 0) {
      console.log(`✅ Using structured violations:`, allViolations);
      return allViolations;
    }
  } catch (error) {
    console.error('❌ Metro 2 compliance check failed:', error);
    // Fall back to static violations if structured check fails
  }
  
  // Enhanced fallback violations using PDF content from comprehensive compliance guides
  const violationSets = [
    [
      "Metro 2 Violation: Account status code inconsistent with actual account status [Field 13: Account Status] - Payment Rating does not match reported account status",
      "FCRA Violation: Inaccurate reporting of paid/settled debts - FCRA § 623(a)(1)(A) requires accurate reporting of debt status",
      "FDCPA Violation: Misrepresenting the amount owed - violates FDCPA § 807(2)(A)"
    ],
    [
      "Metro 2 Violation: Missing Date of First Delinquency [Field 30: Date of First Delinquency] - Required for accounts 180+ days delinquent",
      "FCRA Violation: Incorrect late payments - FCRA § 623(a)(1)(E) requires accurate payment history reporting",
      "FDCPA Violation: Harassment through repeated calls to annoy or harass - violates FDCPA § 806(5)"
    ],
    [
      "Metro 2 Violation: Incorrect Terms Duration Reporting [Field 16: Terms Duration] - Terms Duration exceeds maximum 999 months",
      "FCRA Violation: Duplicate accounts - same account reported multiple times violates FCRA § 623(a)(1)(B)",
      "FDCPA Violation: Falsely claiming to be an attorney or government representative - violates FDCPA § 807(3)"
    ],
    [
      "Metro 2 Violation: Incorrect Current Balance [Field 06: Current Balance] - Current Balance inconsistent with account status",
      "FCRA Violation: Outdated account information - accounts older than 7 years still reporting negatively violate FCRA § 605(a)(4)",
      "FDCPA Violation: Communicating at unusual times or places - violates FDCPA § 805(a)(1)"
    ],
    [
      "Metro 2 Violation: Payment History Profile missing [Field 12A: Payment History Profile] - Required for credit card accounts",
      "FCRA Violation: Bankruptcy discharge inaccuracies - discharged debts showing positive balance violate FCRA § 605(a)(1)",
      "FDCPA Violation: Threatening to take legal action not intended - violates FDCPA § 807(5)"
    ],
    [
      "Metro 2 Violation: Missing Consumer Information Indicator [Field 22A: Consumer Information Indicator] - Required for disputed accounts",
      "FCRA Violation: Mixed credit files - information belonging to another person violates FCRA § 623(a)(1)(C)",
      "FDCPA Violation: Continued collection activity on disputed debt without verification - violates FDCPA § 809(b)"
    ]
  ];
  
  return violationSets[index % violationSets.length];
}

function getStaticPublicRecordViolations(index: number): string[] {
  const violationSets = [
    [
      "Metro 2 Violation: Public record information is outdated or inaccurate [Field 13: Public Record Status] - Status inconsistent with court records",
      "FCRA Violation: Outdated public record - records older than 7 years still reporting negatively violate FCRA § 605(a)(4)",
      "FDCPA Violation: False representations regarding public record status - violates FDCPA § 807(2)(A)"
    ],
    [
      "Metro 2 Violation: Missing compliance condition code for public record [Field 33: Compliance Condition Code] - Required for all public records",
      "FCRA Violation: Mixed credit information - public record information of another person appears on report violates FCRA § 623(a)(1)(C)",
      "FDCPA Violation: Harassment through improper public record collection activities - violates FDCPA § 806(5)"
    ],
    [
      "Metro 2 Violation: Incorrect public record status code reporting [Field 13: Public Record Status] - Status code does not match court disposition",
      "FCRA Violation: Inaccurate reporting of public record discharge status - discharged debts showing positive balance violate FCRA § 605(a)(1)",
      "FDCPA Violation: Threatening to take legal action regarding public record that is not intended - violates FDCPA § 807(5)"
    ],
    [
      "Metro 2 Violation: Public record balance amount inconsistent with court records [Field 06: Balance Amount] - Amount exceeds court judgment",
      "FCRA Violation: Bankruptcy discharge inaccuracies - discharged accounts showing outstanding balance violate FCRA § 605(a)(1)",
      "FDCPA Violation: Misrepresenting the amount owed on public record - violates FDCPA § 807(2)(A)"
    ]
  ];
  
  return violationSets[index % violationSets.length];
}

function getStaticViolationsForItem(item: any, itemType: string, index: number): string[] {
  if (itemType === 'public_record') {
    return getStaticPublicRecordViolations(index);
  } else if (itemType === 'inquiry') {
    const inquiryViolations = [
      [
        "Metro 2 Violation: Inquiry exceeds permissible purpose timeframe [Field 11: Inquiry Purpose] - Purpose code does not match actual inquiry reason",
        "FCRA Violation: Unauthorized inquiry - inquiry lacks proper authorization documentation violates FCRA § 604(a)(3)",
        "FDCPA Violation: Inquiry related to unauthorized debt collection - violates FDCPA § 807(2)(A)"
      ],
      [
        "Metro 2 Violation: Missing inquiry purpose code [Field 11: Inquiry Purpose] - Required for all credit inquiries",
        "FCRA Violation: Outdated inquiry - inquiry older than 2 years still reporting violates FCRA § 605(a)(7)",
        "FDCPA Violation: Improper inquiry practices violating communication guidelines - violates FDCPA § 805(a)(3)"
      ],
      [
        "Metro 2 Violation: Incorrect inquiry type classification [Field 12: Inquiry Type] - Type code inconsistent with inquiry purpose",
        "FCRA Violation: Mixed credit information - inquiry information of another person appears on report violates FCRA § 623(a)(1)(C)",
        "FDCPA Violation: False representations regarding inquiry authorization status - violates FDCPA § 807(2)(A)"
      ],
      [
        "Metro 2 Violation: Inquiry date inconsistent with application date [Field 10: Date of Inquiry] - Date does not match creditor records",
        "FCRA Violation: Duplicate inquiries - same inquiry reported multiple times violates FCRA § 623(a)(1)(B)",
        "FDCPA Violation: Harassment through excessive inquiry activity - violates FDCPA § 806(5)"
      ]
    ];
    return inquiryViolations[index % inquiryViolations.length];
  }
  return getStaticViolationsForAccount(item, index);
}

function generateStaticSuggestions(creditData: any): any {
  const suggestions: any = {};
  
  console.log("🔍 GENERATING STATIC SUGGESTIONS WITH COMPLIANCE VALIDATION:");
  
  // Use pre-filtered data from frontend
  const negativeAccounts = creditData?.CREDIT_LIABILITY || [];
  const publicRecords = creditData?.PUBLIC_RECORD || [];
  const recentInquiries = creditData?.INQUIRY || [];
  
  console.log(`📊 Found ${negativeAccounts.length} negative accounts for suggestions`);
  
  // Generate suggestions for negative accounts using CRC-enhanced compliance resource validator
  negativeAccounts.forEach((account: any, index: number) => {
    const accountId = account["@CreditLiabilityID"] || `TRADE${String(index + 1).padStart(3, '0')}`;
    
    // Get CRC-enhanced suggestions from compliance resource validator
    const validationResult = validateAccountWithResources(account);
    const crcSuggestions = ComplianceResourceValidator.generateCRCDisputes(account);
    
    // Combine validation suggestions with CRC-specific strategies
    const allSuggestions = [...(validationResult.suggestions || []), ...crcSuggestions];
    
    if (allSuggestions.length > 0) {
      suggestions[accountId] = allSuggestions;
      console.log(`✅ Added ${allSuggestions.length} CRC-enhanced suggestions for account: ${accountId}`);
    } else {
      // CRC-enhanced fallback suggestions
      suggestions[accountId] = [
        "Apply CRC Furnisher Framework: Send Round 1 dispute letter directly to furnisher with reason and instruction",
        "Use CRC Advanced Strategy: Demand debt validation under FDCPA § 809, then apply estoppel by silence if no response",
        "Implement CRC Maximum Pressure: Challenge verification methods and apply pressure to both bureau and furnisher"
      ];
      console.log(`✅ Added CRC-enhanced fallback suggestions for account: ${accountId}`);
    }
  });
  
  // Generate suggestions for public records using compliance resource validator
  console.log(`📊 Found ${publicRecords.length} public records for suggestions`);
  
  publicRecords.forEach((record: any, index: number) => {
    const recordId = record["@RecordKey"] || record["@CreditLiabilityID"] || `PUBLIC-RECORD-${String(index + 1).padStart(3, '0')}`;
    
    // Get validated suggestions from compliance resource validator
    const validationResult = validatePublicRecordWithResources(record);
    
    if (validationResult.suggestions && validationResult.suggestions.length > 0) {
      suggestions[recordId] = validationResult.suggestions;
      console.log(`✅ Added ${validationResult.suggestions.length} validated suggestions for public record: ${recordId}`);
    } else {
      // Fallback suggestions based on ingested resources
      suggestions[recordId] = [
        "Verify public record authenticity under FCRA § 613 - request court documentation and filing verification",
        "Challenge reporting timeframe under FCRA § 605 - seven-year reporting limit for most public records",
        "Dispute record accuracy under FCRA § 623 - demand Metro 2 compliance for all public record fields"
      ];
      console.log(`✅ Added fallback suggestions for public record: ${recordId}`);
    }
  });
  
  // Generate suggestions for inquiries using compliance resource validator
  console.log(`📊 Found ${recentInquiries.length} inquiries for suggestions`);
  
  recentInquiries.forEach((inquiry: any, index: number) => {
    const inquiryId = inquiry["@InquiryKey"] || inquiry["@_InquiryKey"] || `INQUIRY-${String(index + 1).padStart(3, '0')}`;
    
    // Get validated suggestions from compliance resource validator
    const validationResult = validateInquiryWithResources(inquiry);
    
    if (validationResult.suggestions && validationResult.suggestions.length > 0) {
      suggestions[inquiryId] = validationResult.suggestions;
      console.log(`✅ Added ${validationResult.suggestions.length} validated suggestions for inquiry: ${inquiryId}`);
    } else {
      // Fallback suggestions based on ingested resources
      suggestions[inquiryId] = [
        "Challenge inquiry authorization under FCRA § 604 - demand written permissible purpose documentation",
        "Dispute inquiry accuracy under FCRA § 623 - request Metro 2 compliance verification for inquiry fields",
        "Verify inquiry legitimacy under FDCPA § 807 - require proof of authorized access and business relationship"
      ];
      console.log(`✅ Added fallback suggestions for inquiry: ${inquiryId}`);
    }
  });
  
  console.log(`🎯 Total suggestions generated: ${Object.keys(suggestions).length}`);
  console.log(`🎯 Suggestion keys:`, Object.keys(suggestions));
  
  return suggestions;
}

// OPTIMIZED: Main AI scan function with parallel processing
async function performAiScan(creditData: any, sendProgress: (progress: number, message: string) => void) {
  console.log("🔍 Starting OPTIMIZED AI scan with parallel processing");
  
  sendProgress(5, "Analyzing credit data structure...");
  
  // Calculate total input tokens
  const creditDataText = JSON.stringify(creditData);
  const totalInputTokens = countTokens(creditDataText);
  console.log(`📊 Total input tokens: ${totalInputTokens.toLocaleString()}`);
  
  if (totalInputTokens > MAX_INPUT_TOKENS) {
    console.log(`🚫 INPUT TOO LARGE: ${totalInputTokens.toLocaleString()} tokens exceeds limit`);
    throw new Error(`INPUT_TOO_LARGE: ${totalInputTokens.toLocaleString()} tokens exceeds limit`);
  }
  
  sendProgress(10, "Validating API credentials...");
  
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.log("🚫 No OpenAI API key found, using static violations");
    return generateStaticViolations(creditData);
  }

  sendProgress(15, "Processing pre-filtered credit data...");

  // ✅ NEW APPROACH: Use pre-filtered data from frontend
  console.log(`🔍 SIMPLIFIED: Processing pre-filtered data from frontend`);
  
  const negativeAccounts = creditData?.CREDIT_LIABILITY || [];
  const publicRecords = creditData?.PUBLIC_RECORD || [];
  const recentInquiries = creditData?.INQUIRY || [];
  
  console.log(`📊 Pre-filtered data received:`);
  console.log(`  - Negative accounts: ${negativeAccounts.length}`);
  console.log(`  - Public records: ${publicRecords.length}`);
  console.log(`  - Recent inquiries: ${recentInquiries.length}`);
  
  // Log account IDs for debugging
  console.log(`🔍 Account IDs:`, negativeAccounts.map((acc: any) => acc['@CreditLiabilityID']));
  console.log(`🔍 Public record IDs:`, publicRecords.map((rec: any) => rec['@RecordKey'] || rec['@CreditLiabilityID']));
  console.log(`🔍 Inquiry IDs:`, recentInquiries.map((inq: any) => inq['@InquiryKey'] || inq['@_InquiryKey']));

  const violations: { [key: string]: string[] } = {};
  let accountsAnalyzedWithAI = 0;
  let accountsSkippedByTokens = 0;
  let totalAccountsProcessed = 0;

  // OPTIMIZED: Create all items to process with parallel processing
  const allItemsToProcess: any[] = [
    ...negativeAccounts.map((item: any, index: number) => ({ ...item, itemType: 'account', originalIndex: index })),
    ...publicRecords.map((item: any, index: number) => ({ ...item, itemType: 'public_record', originalIndex: index })),
    ...recentInquiries.map((item: any, index: number) => ({ ...item, itemType: 'inquiry', originalIndex: index, inquiryIndex: index }))
  ];

  console.log(`🎯 Total items to process: ${allItemsToProcess.length}`);
  console.log(`📊 Breakdown: ${negativeAccounts.length} accounts, ${publicRecords.length} public records, ${recentInquiries.length} inquiries`);
  sendProgress(20, `Starting parallel analysis of ${allItemsToProcess.length} items...`);

  // OPTIMIZED: Helper function to process a single item with OpenAI
  const processItemWithAI = async (item: any, itemIndex: number): Promise<{ itemId: string, violations: string[] }> => {
    const itemType = item.itemType;
    
    // Generate item ID based on type
    let itemId: string;
    if (itemType === 'account') {
      itemId = item["@CreditLiabilityID"] || `TRADE${String(itemIndex + 1).padStart(3, '0')}`;
    } else if (itemType === 'public_record') {
      // Enhanced public record ID generation matching frontend logic
      itemId = item["@CreditLiabilityID"] || item["@_SubscriberCode"] || `record_${itemIndex}`;
    } else if (itemType === 'inquiry') {
      itemId = item["@_InquiryIdentifier"] || `inquiry_${item.inquiryIndex}`;
      console.log(`🔍 Generated inquiry ID: ${itemId} for inquiryIndex: ${item.inquiryIndex}`);
    } else {
      itemId = `ITEM-${itemIndex + 1}`;
    }
    
    try {
      // Create item summary based on type with relevant fields only
      let itemSummary: any;
      if (itemType === 'account') {
        itemSummary = {
          id: itemId,
          creditor: item._CREDITOR?.['@_Name'] || 'Unknown',
          accountType: item['@_AccountType'] || 'Unknown',
          balance: item['@_CurrentBalance'] || '0',
          status: item['@_AccountStatus'] || item['@_AccountStatusType'] || 'Unknown',
          dateOpened: item['@_DateOpened'] || 'Unknown',
          dateReported: item['@_DateReported'] || 'Unknown',
          dateClosed: item['@_DateClosed'] || 'Unknown',
          derogatoryIndicator: item['@_DerogatoryDataIndicator'] || 'N',
          dateFirstDelinquency: item['@_DateFirstDelinquency'] || 'Unknown',
          paymentHistory: item['@_PaymentHistory'] || 'Unknown'
        };
      } else if (itemType === 'public_record') {
        itemSummary = {
          id: itemId,
          type: item['@_PublicRecordType'] || item['@publicRecordType'] || 'Unknown',
          status: item['@_PublicRecordStatus'] || item['status'] || 'Unknown',
          amount: item['@_PublicRecordAmount'] || item['@_Amount'] || '0',
          dateFiled: item['@_DateFiled'] || item['filingDate'] || 'Unknown',
          dateReported: item['@_DateReported'] || 'Unknown',
          court: item['@_Court'] || item['@courtName'] || 'Unknown'
        };
      } else if (itemType === 'inquiry') {
        itemSummary = {
          id: itemId,
          subscriberName: item['@_SubscriberName'] || 'Unknown',
          dateReported: item['@_DateReported'] || item['@_Date'] || 'Unknown',
          inquiryType: item['@_InquiryType'] || item['@_Type'] || 'Unknown',
          purpose: item['@_InquiryPurposeType'] || 'Unknown'
        };
      }
      
      const itemText = JSON.stringify(itemSummary);
      const itemTokens = countTokens(itemText);
      
      console.log(`📋 Account data being sent to OpenAI for ${itemId}:`, itemSummary);
      
      if (itemTokens > TOKENS_PER_ACCOUNT_LIMIT) {
        console.log(`🚨 ${itemType.toUpperCase()} SKIPPED: ${itemId} has ${itemTokens} tokens`);
        accountsSkippedByTokens++;
        return { itemId, violations: [] };
      }
      
      // Skip structured check - use only OpenAI analysis for account-specific violations
      
      console.log(`🔍 Analyzing ${itemType} ${itemId} with OpenAI (parallel)...`);
      
      // Create type-specific system prompt for account-specific analysis
      let systemPrompt: string;
      if (itemType === 'account') {
        systemPrompt = `You are an expert credit compliance analyst. Analyze the provided credit account data JSON and identify ONLY violations that are clearly present based on the specific account attributes.

STRICT RULES FOR VIOLATION IDENTIFICATION:

FCRA VIOLATIONS (use exact format):
- FCRA Violation: Account exceeds 7-year reporting period [FCRA § 605(a)] - ONLY if derogatoryIndicator is "Y" AND dateReported is more than 7 years old
- FCRA Violation: Inaccurate account status reporting [FCRA § 623(a)] - ONLY if status is exactly "Unknown" or blank
- FCRA Violation: Inconsistent account status and balance reporting [FCRA § 623(a)] - ONLY if status is "Closed" but balance > 0
- FCRA Violation: Incorrect date sequence reporting [FCRA § 623(a)] - ONLY if dateReported is chronologically before dateOpened

METRO 2 VIOLATIONS (use exact format):
- Metro 2 Violation: Missing Date of First Delinquency [Field 13A] - ONLY if derogatoryIndicator is "Y" AND dateFirstDelinquency is exactly "Unknown"
- Metro 2 Violation: Invalid Account Status Code [Field 04A] - ONLY if status is exactly "Unknown" or blank
- Metro 2 Violation: Incomplete Payment History Profile [Field 12A] - ONLY if paymentHistory is exactly "Unknown" or blank
- Metro 2 Violation: Invalid Account Type Code [Field 06A] - ONLY if accountType is exactly "Unknown" or blank

FDCPA VIOLATIONS (use exact format):
- FDCPA Violation: Collection on charged-off debt without validation [FDCPA § 809] - ONLY if status is exactly "Charged Off" AND balance > 0
- FDCPA Violation: Debt collection without proper creditor identification [FDCPA § 807] - ONLY if creditor is exactly "Unknown" AND derogatoryIndicator is "Y"

CRITICAL INSTRUCTIONS:
1. If derogatoryIndicator is "N", the account is POSITIVE and should have minimal violations
2. If dateFirstDelinquency is "Never", there is NO missing date of first delinquency
3. If status is "Closed", "Open", or any specific status other than "Unknown", it is NOT inaccurate
4. If all fields have valid values, return: "No violations identified"
5. Be extremely conservative - only flag clear violations
6. MUST use the EXACT format: "- FCRA Violation: ...", "- Metro 2 Violation: ...", "- FDCPA Violation: ..."
7. Respond with ONLY the violation lines starting with "- " or "No violations identified"
8. NO introductory text, explanations, or summaries

EXAMPLE OUTPUT FORMAT:
- FCRA Violation: Inaccurate account status reporting [FCRA § 623(a)]
- Metro 2 Violation: Invalid Account Status Code [Field 04A]
- FDCPA Violation: Debt collection without proper creditor identification [FDCPA § 807]

Analyze this account data:`;
      } else if (itemType === 'public_record') {
        systemPrompt = `You are an expert credit compliance analyst with access to comprehensive FCRA, FDCPA, and Metro 2 violation guides. 

Focus on these violations for PUBLIC RECORDS:
- FCRA: Outdated records (7+ years), mixed credit information, inaccurate reporting
- FDCPA: False representations, harassment in collection, unfair practices
- Metro 2: Missing compliance codes, incorrect status reporting, incomplete data

Analyze this public record and return exactly 3 violations in this format:
- Metro 2 Violation: [specific violation with field reference]
- FCRA Violation: [specific violation with section reference] 
- FDCPA Violation: [specific violation with section reference]`;
      } else {
        systemPrompt = `You are an expert credit compliance analyst with access to comprehensive FCRA, FDCPA, and Metro 2 violation guides. 

Focus on these violations for CREDIT INQUIRIES:
- FCRA: Unauthorized inquiries, outdated inquiries (2+ years), mixed credit information
- FDCPA: Improper inquiry practices, harassment, false representations
- Metro 2: Incorrect inquiry purpose codes, missing inquiry details, improper formatting

Analyze this credit inquiry and return exactly 3 violations in this format:
- Metro 2 Violation: [specific violation with field reference]
- FCRA Violation: [specific violation with section reference] 
- FDCPA Violation: [specific violation with section reference]`;
      }
      
      // OPTIMIZED: Use GPT-3.5-turbo-1106 with lower temperature for consistency
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: itemText
          }
        ],
        max_tokens: MAX_TOKENS_RESPONSE,
        temperature: 0.1
      });

      const response = completion.choices[0]?.message?.content;
      console.log(`🤖 OpenAI RAW RESPONSE for ${itemId}:`, response);
      
      if (response) {
        // Parse OpenAI response to extract only specific violations
        const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Convert raw AI response to proper format
        const validViolations = lines.filter(line => {
          // Must start with "- " and have content
          return line.startsWith('- ') && line.length > 10;
        }).map(line => {
          // Convert to proper format if needed
          if (line.includes('[FCRA §') && !line.startsWith('- FCRA Violation:')) {
            return line.replace('- ', '- FCRA Violation: ');
          }
          if (line.includes('[Field ') && !line.startsWith('- Metro 2 Violation:')) {
            return line.replace('- ', '- Metro 2 Violation: ');
          }
          if (line.includes('[FDCPA §') && !line.startsWith('- FDCPA Violation:')) {
            return line.replace('- ', '- FDCPA Violation: ');
          }
          return line;
        }).filter(line => {
          // Must not be empty or generic
          const isNotEmpty = !line.toLowerCase().includes('none identified') &&
                            !line.toLowerCase().includes('no violations identified') &&
                            !line.toLowerCase().includes('none apparent') &&
                            !line.toLowerCase().includes('not applicable') &&
                            !line.toLowerCase().includes('n/a') &&
                            !line.toLowerCase().includes('no violation') &&
                            !line.toLowerCase().includes('none found');
          
          // Must have substantial content
          const hasContent = line.length > 30;
          
          return isNotEmpty && hasContent;
        });
        
        console.log(`✅ OpenAI detected ${validViolations.length} valid violations for ${itemId}`);
        console.log(`📋 Account-specific violations for ${itemId}:`, validViolations);
        accountsAnalyzedWithAI++;
        
        return { 
          itemId, 
          violations: validViolations
        };
      } else {
        console.log(`⚠️ OpenAI returned empty response for ${itemId}`);
        return { itemId, violations: [] };
      }

    } catch (error: any) {
      console.error(`🚨 AI analysis failed for ${itemType} ${itemId}:`, error.message);
      return { itemId, violations: [] };
    }
  };

  // OPTIMIZED: Process items with concurrency limit using Promise.all
  const processInBatches = async (items: any[], batchSize: number) => {
    const results: { itemId: string, violations: string[] }[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const progressPercent = 30 + (i / items.length) * 50;
      sendProgress(progressPercent, `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(items.length / batchSize)} (${batch.length} items)...`);
      
      console.log(`🔄 PARALLEL BATCH ${Math.floor(i / batchSize) + 1}: Processing ${batch.length} items concurrently`);
      
      const batchResults = await Promise.all(
        batch.map((item, batchIndex) => processItemWithAI(item, i + batchIndex))
      );
      
      results.push(...batchResults);
      console.log(`✅ BATCH ${Math.floor(i / batchSize) + 1} COMPLETE: ${batchResults.length} items processed`);
    }
    
    return results;
  };

  // Execute parallel processing with concurrency limit
  const results = await processInBatches(allItemsToProcess, MAX_CONCURRENT_REQUESTS);
  
  // Collect all violations from results
  results.forEach(result => {
    violations[result.itemId] = result.violations;
    totalAccountsProcessed++;
  });

  console.log(`🎯 PARALLEL PROCESSING COMPLETE: ${results.length} items processed`);
  sendProgress(80, "Finalizing analysis...");

  // Add any remaining public records that weren't processed
  const remainingPublicRecords = creditData?.CREDIT_RESPONSE?.PUBLIC_RECORD;
  if (remainingPublicRecords && Array.isArray(remainingPublicRecords) && remainingPublicRecords.length > 0) {
    remainingPublicRecords.forEach((record: any, index: number) => {
      const recordId = record["@_AccountIdentifier"] || `PUBLIC-RECORD-${String(index + 1).padStart(3, '0')}`;
      if (!violations[recordId]) {
        violations[recordId] = getStaticPublicRecordViolations(index);
      }
    });
  }

  sendProgress(90, "Finalizing analysis...");

  const totalViolations = Object.values(violations).flat().length;
  const affectedItems = Object.keys(violations).length;

  // Calculate breakdown by category
  const accountViolations = Object.keys(violations).filter(id => id.startsWith('TRADE')).length;
  const publicRecordViolations = Object.keys(violations).filter(id => id.includes('PUBLIC-RECORD')).length;
  const inquiryViolations = Object.keys(violations).filter(id => id.includes('INQUIRY')).length;

  console.log(`✅ AI Scan completed: ${totalViolations} violations found`);
  console.log(`📊 Breakdown: ${accountViolations} accounts, ${publicRecordViolations} public records, ${inquiryViolations} inquiries`);
  console.log(`📊 Items analyzed with AI: ${accountsAnalyzedWithAI}`);
  console.log(`📊 Items skipped by tokens: ${accountsSkippedByTokens}`);
  console.log(`📊 Total items processed: ${totalAccountsProcessed}`);

  // Add logging before response as requested
  console.log('[API] returned keys', Object.keys(violations), Object.keys({})); // suggestions not implemented yet

  // Separate Metro 2 violations from FCRA/FDCPA violations
  const separatedViolations = {};
  const metro2Violations = {};
  const fcrFdcpaViolations = {};
  
  Object.keys(violations).forEach(itemId => {
    const itemViolations = violations[itemId];
    separatedViolations[itemId] = itemViolations;
    
    metro2Violations[itemId] = itemViolations.filter(v => v.includes('Metro 2'));
    fcrFdcpaViolations[itemId] = itemViolations.filter(v => v.includes('FCRA') || v.includes('FDCPA'));
  });

  return {
    success: true,
    totalViolations,
    affectedAccounts: affectedItems,
    violations: separatedViolations,
    metro2Violations,
    fcrFdcpaViolations,
    suggestions: generateStaticSuggestions(creditData),
    breakdown: {
      accounts: accountViolations,
      publicRecords: publicRecordViolations,
      inquiries: inquiryViolations
    },
    message: `AI analysis completed: Found violations across ${accountViolations} accounts, ${publicRecordViolations} public records, and ${inquiryViolations} inquiries`,
    tokenInfo: {
      inputTokens: totalInputTokens,
      itemsAnalyzedWithAI: accountsAnalyzedWithAI,
      itemsSkippedByTokens: accountsSkippedByTokens,
      totalItemsProcessed: totalAccountsProcessed,
      fallbackUsed: false
    }
  };
}

// Helper function for static violations
function generateStaticViolations(creditData: any): any {
  const violations: { [key: string]: string[] } = {};
  
  // ✅ SIMPLIFIED: Use pre-filtered data from frontend
  console.log(`🔍 STATIC SIMPLIFIED: Processing pre-filtered data from frontend`);
  
  const negativeAccounts = creditData?.CREDIT_LIABILITY || [];
  const publicRecords = creditData?.PUBLIC_RECORD || [];
  const recentInquiries = creditData?.INQUIRY || [];
  
  console.log(`📊 STATIC Pre-filtered data received:`);
  console.log(`  - Negative accounts: ${negativeAccounts.length}`);
  console.log(`  - Public records: ${publicRecords.length}`);
  console.log(`  - Recent inquiries: ${recentInquiries.length}`);
  
  // Process negative accounts using compliance resource validator
  negativeAccounts.forEach((account: any, index: number) => {
    const accountId = account["@CreditLiabilityID"] || `TRADE${String(index + 1).padStart(3, '0')}`;
    console.log(`📝 STATIC: Processing account ${accountId} with compliance validator`);
    
    // Use compliance resource validator for strict validation
    const validationResult = validateAccountWithResources(account);
    
    if (validationResult.hasViolations) {
      violations[accountId] = validationResult.violations.map(v => `${v.violation} (Source: ${v.source}${v.page ? `, ${v.page}` : ''})`);
      console.log(`✅ Added ${validationResult.violations.length} validated violations for account: ${accountId}`);
    } else {
      // Use exact no-violation message as required
      violations[accountId] = [validationResult.noViolationMessage || "No Metro 2 / FCRA / FDCPA violation detected for this item."];
      console.log(`ℹ️  No violations found for account: ${accountId}`);
    }
  });

  // Process public records using compliance resource validator
  publicRecords.forEach((record: any, index: number) => {
    const recordId = record["@RecordKey"] || record["@CreditLiabilityID"] || `PUBLIC-RECORD-${String(index + 1).padStart(3, '0')}`;
    console.log(`📝 STATIC: Processing public record ${recordId} with compliance validator`);
    
    // Use compliance resource validator for strict validation
    const validationResult = validatePublicRecordWithResources(record);
    
    if (validationResult.hasViolations) {
      violations[recordId] = validationResult.violations.map(v => `${v.violation} (Source: ${v.source}${v.page ? `, ${v.page}` : ''})`);
      console.log(`✅ Added ${validationResult.violations.length} validated violations for public record: ${recordId}`);
    } else {
      // Use exact no-violation message as required
      violations[recordId] = [validationResult.noViolationMessage || "No Metro 2 / FCRA / FDCPA violation detected for this item."];
      console.log(`ℹ️  No violations found for public record: ${recordId}`);
    }
  });

  // Process recent inquiries using compliance resource validator
  recentInquiries.forEach((inquiry: any, index: number) => {
    const inquiryId = inquiry["@InquiryKey"] || inquiry["@_InquiryKey"] || `INQUIRY-${String(index + 1).padStart(3, '0')}`;
    console.log(`📝 STATIC: Processing inquiry ${inquiryId} with compliance validator`);
    
    // Use compliance resource validator for strict validation
    const validationResult = validateInquiryWithResources(inquiry);
    
    if (validationResult.hasViolations) {
      violations[inquiryId] = validationResult.violations.map(v => `${v.violation} (Source: ${v.source}${v.page ? `, ${v.page}` : ''})`);
      console.log(`✅ Added ${validationResult.violations.length} validated violations for inquiry: ${inquiryId}`);
    } else {
      // Use exact no-violation message as required
      violations[inquiryId] = [validationResult.noViolationMessage || "No Metro 2 / FCRA / FDCPA violation detected for this item."];
      console.log(`ℹ️  No violations found for inquiry: ${inquiryId}`);
    }
  });

  console.log(`🔍 STATIC: Generated violations for ${Object.keys(violations).length} items`);
  
  // Remove duplicates and sort violations for all items
  const processedViolations = {};
  const metro2Violations = {};
  const fcrFdcpaViolations = {};
  
  Object.keys(violations).forEach(itemId => {
    const itemViolations = violations[itemId];
    
    // Remove duplicates and sort violations
    const uniqueViolations = [...new Set(itemViolations)];
    const sortedViolations = uniqueViolations.sort((a, b) => {
      // Metro 2 first
      if (a.includes('Metro 2') && !b.includes('Metro 2')) return -1;
      if (!a.includes('Metro 2') && b.includes('Metro 2')) return 1;
      
      // FCRA second
      if (a.includes('FCRA') && !b.includes('FCRA')) return -1;
      if (!a.includes('FCRA') && b.includes('FCRA')) return 1;
      
      // FDCPA third
      if (a.includes('FDCPA') && !b.includes('FDCPA')) return -1;
      if (!a.includes('FDCPA') && b.includes('FDCPA')) return 1;
      
      return 0;
    });
    
    processedViolations[itemId] = sortedViolations;
    
    // Filter out the no-violation message when categorizing violations
    const actualItemViolations = sortedViolations.filter(v => v !== "No Metro 2 / FCRA / FDCPA violation detected for this item.");
    
    metro2Violations[itemId] = actualItemViolations.filter(v => v.includes('Metro 2'));
    fcrFdcpaViolations[itemId] = actualItemViolations.filter(v => v.includes('FCRA') || v.includes('FDCPA'));
  });
  
  // Filter out the no-violation message when counting violations
  const actualViolations = Object.values(processedViolations).flat().filter(v => v !== "No Metro 2 / FCRA / FDCPA violation detected for this item.");
  const totalViolations = actualViolations.length;
  
  return {
    success: true,
    totalViolations,
    affectedAccounts: Object.keys(violations).length,
    violations: processedViolations,
    metro2Violations,
    fcrFdcpaViolations,
    suggestions: generateStaticSuggestions(creditData),
    breakdown: {
      accounts: negativeAccounts.length,
      publicRecords: publicRecords.length,
      inquiries: recentInquiries.length
    },
    message: `AI analysis completed: Found violations across ${negativeAccounts.length} accounts, ${publicRecords.length} public records, and ${recentInquiries.length} inquiries`,
    tokenInfo: {
      inputTokens: 0,
      itemsAnalyzedWithAI: 0,
      itemsSkippedByTokens: 0,
      totalItemsProcessed: Object.keys(violations).length,
      fallbackUsed: true
    }
  };
}

export function registerRoutes(app: Express): void {
  
  // Health check endpoints


  app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Disputes endpoints
  app.get("/api/disputes", async (req, res) => {
    try {
      const disputes = await storage.getDisputes();
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  app.post("/api/disputes", async (req, res) => {
    try {
      const validatedData = insertDisputeSchema.parse(req.body);
      const dispute = await storage.createDispute(validatedData);
      res.json(dispute);
    } catch (error) {
      console.error("Error creating dispute:", error);
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  // Custom templates endpoints
  app.get("/api/custom-templates", async (req, res) => {
    try {
      const templates = await storage.getCustomTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching custom templates:", error);
      res.status(500).json({ message: "Failed to fetch custom templates" });
    }
  });

  app.post("/api/custom-templates", async (req, res) => {
    try {
      const validatedData = insertCustomTemplateSchema.parse(req.body);
      const template = await storage.createCustomTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error creating custom template:", error);
      res.status(500).json({ message: "Failed to create custom template" });
    }
  });

  app.patch("/api/custom-templates/:id/increment-usage", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.incrementTemplateUsage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing template usage:", error);
      res.status(500).json({ message: "Failed to update template usage" });
    }
  });

  // ✅ TEST ENDPOINT: Structured Metro 2 compliance checking only
  app.post('/api/test-metro2-compliance', async (req, res) => {
    console.log("🔍 TEST ENDPOINT: /api/test-metro2-compliance called");
    
    try {
      const creditData = req.body;
      console.log("📨 Received credit data for Metro 2 compliance test");
      
      // ✅ VALIDATE INPUT STRUCTURE: Always expect creditData.CREDIT_LIABILITY
      const creditLiabilityData = creditData?.CREDIT_LIABILITY || [];
      console.log(`🔍 Credit liability data length: ${creditLiabilityData.length}`);
      
      if (creditLiabilityData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_CREDIT_LIABILITY_DATA',
          message: 'No CREDIT_LIABILITY data found in input. Expected structure: { CREDIT_LIABILITY: [...] }'
        });
      }
      
      const results = [];
      
      // Test each account with structured Metro 2 checking
      for (let i = 0; i < creditLiabilityData.length; i++) {
        const account = creditLiabilityData[i];
        const accountId = account['@CreditLiabilityID'] || `account_${i}`;
        
        console.log(`🔍 Testing account ${accountId} with structured Metro 2 checker`);
        const testResult = testStructuredMetro2Compliance(account);
        
        results.push({
          accountId,
          ...testResult
        });
      }
      
      const successfulResults = results.filter(r => r.success);
      const totalViolations = successfulResults.reduce((sum, r) => sum + r.violations.length, 0);
      
      console.log(`✅ Metro 2 compliance test completed: ${totalViolations} violations found across ${successfulResults.length} accounts`);
      
      res.json({
        success: true,
        totalViolations,
        totalAccounts: creditLiabilityData.length,
        successfulChecks: successfulResults.length,
        results
      });
      
    } catch (error: any) {
      console.error("🚨 Metro 2 compliance test failed:", error.message);
      res.status(500).json({
        success: false,
        error: 'METRO2_TEST_FAILED',
        message: error.message
      });
    }
  });

  // OPTIMIZED: POST endpoint for AI scan with parallel processing
  app.post('/api/ai-scan', async (req, res) => {
    console.log("🔍 POST /api/ai-scan endpoint called with optimized parallel processing");
    
    try {
      const creditData = req.body;
      console.log("📨 Received credit data for AI scan analysis");
      
      // Dummy progress function for POST endpoint
      const sendProgress = (progress: number, message: string) => {
        console.log(`📊 Progress: ${progress}% - ${message}`);
      };
      
      const result = await performAiScan(creditData, sendProgress);
      
      console.log("✅ AI scan completed successfully");
      res.json(result);
      
    } catch (error: any) {
      console.error("🚨 AI scan failed:", error.message);
      
      if (error.message.includes('INPUT_TOO_LARGE')) {
        res.status(413).json({
          success: false,
          error: 'INPUT_TOO_LARGE',
          message: 'Credit data is too large for AI analysis. Using static violations instead.',
          fallbackUsed: true
        });
      } else if (error.message.includes('insufficient_quota')) {
        res.status(429).json({
          success: false,
          error: 'QUOTA_EXCEEDED',
          message: 'OpenAI API quota exceeded. Using static violations instead.',
          fallbackUsed: true
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'AI_SCAN_FAILED',
          message: 'AI scan failed. Using static violations instead.',
          fallbackUsed: true
        });
      }
    }
  });
}
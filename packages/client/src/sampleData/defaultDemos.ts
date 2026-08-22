import { DemoDocument, StepDocument, DOMSnapshot } from '@serverless-tour/common';

export const SAMPLE_NAVIGATE_SNAPSHOTS: Record<string, DOMSnapshot> = {
  'snap_myrotary_finance': {
    id: 'snap_myrotary_finance',
    stepId: 'step_fin_1',
    url: 'https://my.rotary.org/en/club-administration/finance',
    title: 'My Rotary - Club Administration & Invoices',
    capturedAt: 1737244800000,
    viewport: { width: 1280, height: 850, scrollX: 0, scrollY: 0 },
    styles: [
      `
      * { box-sizing: border-box; }
      body { font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #f4f6f8; color: #333333; min-height: 100vh; }
      .header-top { background: #0c3c60; color: #ffffff; padding: 12px 32px; display: flex; justify-content: space-between; align-items: center; }
      .rotary-brand { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
      .rotary-wheel { width: 28px; height: 28px; border-radius: 50%; background: #e3a935; display: inline-flex; align-items: center; justify-content: center; color: #0c3c60; font-weight: 900; font-size: 14px; }
      .nav-bar { background: #ffffff; border-bottom: 1px solid #d9e2ec; padding: 0 32px; display: flex; gap: 24px; font-size: 14px; font-weight: 600; color: #486581; }
      .nav-bar a { text-decoration: none; color: inherit; padding: 16px 4px; display: inline-block; border-bottom: 3px solid transparent; }
      .nav-bar a.active { color: #0c3c60; border-bottom-color: #0c3c60; }
      .container { max-width: 1140px; margin: 30px auto; padding: 0 20px; }
      .page-title { font-size: 24px; font-weight: 700; color: #102a43; margin-bottom: 8px; }
      .page-subtitle { font-size: 14px; color: #627d98; margin-bottom: 24px; }
      .grid-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
      .stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); }
      .stat-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #627d98; margin-bottom: 6px; }
      .stat-value { font-size: 26px; font-weight: 800; color: #102a43; }
      .stat-status { font-size: 12px; font-weight: 600; color: #059669; margin-top: 4px; }
      .table-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); margin-bottom: 24px; }
      .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .table-title { font-size: 16px; font-weight: 700; color: #102a43; margin: 0; }
      table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
      th { background: #f8fafc; padding: 12px 16px; font-weight: 700; color: #486581; border-bottom: 1px solid #e2e8f0; }
      td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334e68; }
      .btn { display: inline-flex; align-items: center; gap: 6px; background: #0c3c60; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
      .btn-gold { background: #d99b00; color: #ffffff; }
      .btn-gold:hover { background: #b78200; }
      .btn-outline { background: transparent; border: 1px solid #0c3c60; color: #0c3c60; }
      .btn-outline:hover { background: #f0f4f8; }
      .badge-paid { background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px; }
      `
    ],
    html: `
      <!DOCTYPE html>
      <html>
        <head><title>My Rotary - Club Finance & Invoices</title></head>
        <body>
          <div class="header-top">
            <div class="rotary-brand">
              <span class="rotary-wheel">★</span>
              <span>My Rotary</span>
            </div>
            <div style="font-size: 13px; display: flex; gap: 16px; align-items: center;">
              <span>Rotaract Club of South Asia (Club ID: #98421)</span>
              <span style="background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 4px; font-weight: 600;">Club Leader View</span>
            </div>
          </div>

          <div class="nav-bar">
            <a href="#home">Home</a>
            <a href="#club-admin" class="active">Club Administration</a>
            <a href="#members">Member Center</a>
            <a href="#learning">Learning & Reference</a>
            <a href="#reports">Reports</a>
          </div>

          <div class="container">
            <h1 class="page-title">Club Invoice & Financial Details</h1>
            <p class="page-subtitle">View and download Rotary International club dues invoices, invoice details, and per-capita member breakdown.</p>

            <div class="grid-cards">
              <div id="stat-current-balance" class="stat-card">
                <div class="stat-title">Current Balance Due</div>
                <div class="stat-value">$0.00 USD</div>
                <div class="stat-status">● Account in Good Standing</div>
              </div>

              <div id="stat-active-members" class="stat-card">
                <div class="stat-title">Billed Member Count</div>
                <div class="stat-value">34 Members</div>
                <div style="font-size: 12px; color: #627d98; margin-top: 4px;">Jan 2025 Invoice Cycle</div>
              </div>

              <div id="stat-latest-invoice" class="stat-card">
                <div class="stat-title">Latest Invoice Date</div>
                <div class="stat-value">01-Jan-2025</div>
                <div style="font-size: 12px; color: #627d98; margin-top: 4px;">Semi-Annual Dues #INV-98421-25A</div>
              </div>
            </div>

            <div id="club-invoices-section" class="table-card">
              <div class="table-header">
                <h2 class="table-title">Official Semi-Annual Club Invoices</h2>
                <div style="display: flex; gap: 10px;">
                  <button id="download-summary-btn" class="btn btn-outline">Download Statement (PDF)</button>
                  <button id="make-payment-btn" class="btn btn-gold">Pay Dues Online</button>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Billing Period</th>
                    <th>Invoice Date</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr id="invoice-row-2025-1">
                    <td style="font-weight: 700; color: #0c3c60;">INV-98421-25A</td>
                    <td>January 2025 – June 2025</td>
                    <td>01-Jan-2025</td>
                    <td>$272.00 USD</td>
                    <td><span class="badge-paid">Paid in Full</span></td>
                    <td>
                      <button id="view-invoice-pdf-btn" class="btn" style="padding: 4px 10px; font-size: 12px;">
                        Download Invoice PDF
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-weight: 700; color: #0c3c60;">INV-98421-24B</td>
                    <td>July 2024 – December 2024</td>
                    <td>01-Jul-2024</td>
                    <td>$256.00 USD</td>
                    <td><span class="badge-paid">Paid in Full</span></td>
                    <td>
                      <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px;">
                        Download Invoice PDF
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="invoice-member-details-card" class="table-card">
              <div class="table-header">
                <div>
                  <h2 class="table-title">Club Invoice Member Details (Roster Breakdown)</h2>
                  <p style="font-size: 12px; color: #627d98; margin: 4px 0 0 0;">Inspect the individual member roster snapshot that was used to calculate the semi-annual dues.</p>
                </div>
                <button id="download-roster-csv-btn" class="btn btn-outline">Export Member List (CSV)</button>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  },
  'snap_drr_finance': {
    id: 'snap_drr_finance',
    stepId: 'step_drr_1',
    url: 'https://my.rotary.org/en/district-administration/finance-reports',
    title: 'My Rotary - DRR District Finance & Reports',
    capturedAt: 1737244800000,
    viewport: { width: 1280, height: 850, scrollX: 0, scrollY: 0 },
    styles: [
      `
      * { box-sizing: border-box; }
      body { font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #f4f6f8; color: #333333; }
      .header-top { background: #0c3c60; color: #ffffff; padding: 12px 32px; display: flex; justify-content: space-between; align-items: center; }
      .rotary-brand { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
      .rotary-wheel { width: 28px; height: 28px; border-radius: 50%; background: #e3a935; display: inline-flex; align-items: center; justify-content: center; color: #0c3c60; font-weight: 900; font-size: 14px; }
      .container { max-width: 1140px; margin: 30px auto; padding: 0 20px; }
      .page-title { font-size: 24px; font-weight: 700; color: #102a43; margin-bottom: 8px; }
      .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.03); margin-bottom: 24px; }
      .btn { display: inline-flex; align-items: center; gap: 6px; background: #0c3c60; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
      table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; margin-top: 16px; }
      th { background: #f8fafc; padding: 12px 16px; font-weight: 700; color: #486581; border-bottom: 1px solid #e2e8f0; }
      td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334e68; }
      `
    ],
    html: `
      <!DOCTYPE html>
      <html>
        <head><title>My Rotary - District Rotaract Representative Access</title></head>
        <body>
          <div class="header-top">
            <div class="rotary-brand">
              <span class="rotary-wheel">★</span>
              <span>My Rotary</span>
            </div>
            <div style="font-size: 13px; display: flex; gap: 16px; align-items: center;">
              <span>Rotaract District 3232 (DRR Access)</span>
              <span style="background: #e3a935; color: #0c3c60; padding: 4px 10px; border-radius: 4px; font-weight: 700;">DRR Officer Role</span>
            </div>
          </div>

          <div class="container">
            <h1 class="page-title">District Club Invoice & Balance Reports</h1>
            <p style="font-size: 14px; color: #627d98; margin-bottom: 24px;">District-wide financial status and dues compliance for all Rotaract clubs in your district.</p>

            <div id="district-reports-selector" class="card">
              <h3 style="margin-top: 0; font-size: 16px; color: #102a43;">Select District Report</h3>
              <div style="display: flex; gap: 16px; margin-top: 12px;">
                <button id="btn-report-invoice-balance" class="btn" style="background: #0c3c60;">Club Invoice Balance Report</button>
                <button id="btn-report-club-rosters" class="btn" style="background: #e2e8f0; color: #334e68;">District Club Data & Leadership</button>
              </div>
            </div>

            <div id="district-table-container" class="card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px; color: #102a43;">Rotaract Clubs Dues Summary (District 3232)</h3>
                <button id="export-district-csv" class="btn" style="background: #059669;">Export District Summary (CSV)</button>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Club Name</th>
                    <th>Club ID</th>
                    <th>Total Members</th>
                    <th>Jan 2025 Dues</th>
                    <th>Balance Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr id="row-club-sample">
                    <td style="font-weight: 700; color: #0c3c60;">Rotaract Club of South Asia Central</td>
                    <td>#98421</td>
                    <td>34</td>
                    <td>$272.00</td>
                    <td>$0.00</td>
                    <td><span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px;">Paid</span></td>
                  </tr>
                  <tr>
                    <td style="font-weight: 700; color: #0c3c60;">Rotaract Club of Metro Pioneers</td>
                    <td>#98502</td>
                    <td>28</td>
                    <td>$224.00</td>
                    <td>$0.00</td>
                    <td><span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px;">Paid</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `
  }
};

// Backwards compatibility aliases
SAMPLE_NAVIGATE_SNAPSHOTS['step_crm_1'] = SAMPLE_NAVIGATE_SNAPSHOTS['snap_myrotary_finance'];
SAMPLE_NAVIGATE_SNAPSHOTS['step_dev_1'] = SAMPLE_NAVIGATE_SNAPSHOTS['snap_drr_finance'];

export const SAMPLE_CRM_SNAPSHOTS = SAMPLE_NAVIGATE_SNAPSHOTS;

export const DEFAULT_DEMO_FIXTURES: { demo: DemoDocument; steps: StepDocument[]; snapshots: Record<string, DOMSnapshot> }[] = [
  {
    demo: {
      id: 'demo_club_finance_invoice',
      title: 'Club Finance (Invoice)',
      description: 'An immersive walkthrough for Rotaract Club Leaders on how to access, view, and download Club Invoices and Invoice Details from My Rotary.',
      authorId: 'author_arun_teja',
      authorEmail: 'zeospec@gmail.com',
      createdAt: 1737244800000,
      updatedAt: 1737244800000,
      stepOrder: ['step_fin_1', 'step_fin_2', 'step_fin_3'],
      isPublished: true,
      publishedManifestUrl: 'https://pub-tour.r2.dev/demos/demo_club_finance_invoice/manifest.json',
      tags: ['Club Access', 'Club Leader Access', 'Finance', 'Invoices'],
      theme: {
        primaryColor: '#0c3c60',
        badgeColor: '#e3a935',
        showBackdrop: true,
        showStepCount: true,
        pulseAnimation: true
      }
    },
    steps: [
      {
        id: 'step_fin_1',
        stepNumber: 1,
        title: 'Reviewing Club Standing & Balance',
        description: 'Start by checking the Current Balance Due card to confirm whether your Rotaract Club has any outstanding semi-annual per-capita dues.',
        targetSelector: '#stat-current-balance',
        targetCoordinates: { x: 30, y: 150, width: 340, height: 110, scrollX: 0, scrollY: 0 },
        placement: 'bottom',
        triggerType: 'click',
        buttonText: 'Next: View Invoices',
        showBackButton: false,
        snapshotUrl: 'snap_myrotary_finance',
        createdAt: 1737244800000
      },
      {
        id: 'step_fin_2',
        stepNumber: 2,
        title: 'Accessing Official Semi-Annual Invoices',
        description: 'Locate your current billing cycle invoice in the Official Invoices table to view billing dates, membership headcounts, and payment statuses.',
        targetSelector: '#invoice-row-2025-1',
        targetCoordinates: { x: 30, y: 360, width: 1080, height: 60, scrollX: 0, scrollY: 0 },
        placement: 'top',
        triggerType: 'click',
        buttonText: 'Next: Download PDF',
        showBackButton: true,
        snapshotUrl: 'snap_myrotary_finance',
        createdAt: 1737244900000
      },
      {
        id: 'step_fin_3',
        stepNumber: 3,
        title: 'Downloading the Invoice & Member Breakdown',
        description: 'Click the Download Invoice PDF button to download the official RI statement and inspect the member list used for per-capita billing.',
        targetSelector: '#view-invoice-pdf-btn',
        targetCoordinates: { x: 920, y: 375, width: 160, height: 36, scrollX: 0, scrollY: 0 },
        placement: 'left',
        triggerType: 'click',
        buttonText: 'Finish Guide',
        showBackButton: true,
        snapshotUrl: 'snap_myrotary_finance',
        createdAt: 1737245000000
      }
    ],
    snapshots: SAMPLE_NAVIGATE_SNAPSHOTS
  },
  {
    demo: {
      id: 'demo_finance_drr_access',
      title: 'Finance (DRR Access)',
      description: 'An immersive guide for District Rotaract Representatives on how to access, view, and export District Club Invoices and Invoice Balance Reports.',
      authorId: 'author_arun_teja',
      authorEmail: 'zeospec@gmail.com',
      createdAt: 1724200000000,
      updatedAt: 1724200000000,
      stepOrder: ['step_drr_1', 'step_drr_2'],
      isPublished: true,
      publishedManifestUrl: 'https://pub-tour.r2.dev/demos/demo_finance_drr_access/manifest.json',
      tags: ['DRR Access', 'District Resources', 'Finance'],
      theme: {
        primaryColor: '#0c3c60',
        badgeColor: '#059669',
        showBackdrop: true,
        showStepCount: true,
        pulseAnimation: true
      }
    },
    steps: [
      {
        id: 'step_drr_1',
        stepNumber: 1,
        title: 'Select District Financial Report',
        description: 'As a DRR, use the Report Selector in My Rotary to load the comprehensive Club Invoice Balance Report across all active clubs in your district.',
        targetSelector: '#district-reports-selector',
        targetCoordinates: { x: 30, y: 140, width: 1080, height: 100, scrollX: 0, scrollY: 0 },
        placement: 'bottom',
        triggerType: 'click',
        buttonText: 'Next: Inspect Dues Table',
        showBackButton: false,
        snapshotUrl: 'snap_drr_finance',
        createdAt: 1724200000000
      },
      {
        id: 'step_drr_2',
        stepNumber: 2,
        title: 'Export District Summary to CSV',
        description: 'Click Export District Summary (CSV) to download all club payment statuses for district reporting and follow-ups.',
        targetSelector: '#export-district-csv',
        targetCoordinates: { x: 880, y: 280, width: 220, height: 40, scrollX: 0, scrollY: 0 },
        placement: 'left',
        triggerType: 'click',
        buttonText: 'Finish DRR Guide',
        showBackButton: true,
        snapshotUrl: 'snap_drr_finance',
        createdAt: 1724200100000
      }
    ],
    snapshots: SAMPLE_NAVIGATE_SNAPSHOTS
  },
  {
    demo: {
      id: 'demo_club_data_drr_access',
      title: 'Club Data (DRR Access)',
      description: 'An interactive demo for District Rotaract Representatives on how to view and download comprehensive membership rosters and officer data of all clubs.',
      authorId: 'author_arun_teja',
      authorEmail: 'zeospec@gmail.com',
      createdAt: 1723500000000,
      updatedAt: 1723500000000,
      stepOrder: ['step_drr_1'],
      isPublished: true,
      publishedManifestUrl: 'https://pub-tour.r2.dev/demos/demo_club_data_drr_access/manifest.json',
      tags: ['DRR Access', 'Club Data', 'District Resources'],
      theme: {
        primaryColor: '#0c3c60',
        badgeColor: '#4f46e5',
        showBackdrop: true,
        showStepCount: true,
        pulseAnimation: true
      }
    },
    steps: [
      {
        id: 'step_drr_1',
        stepNumber: 1,
        title: 'Access District Club Roster Center',
        description: 'Navigate to the District Club Data tool in My Rotary to inspect active rosters, incoming club officers, and membership growth metrics.',
        targetSelector: '#district-table-container',
        targetCoordinates: { x: 30, y: 260, width: 1080, height: 300, scrollX: 0, scrollY: 0 },
        placement: 'top',
        triggerType: 'click',
        buttonText: 'Finish Guide',
        showBackButton: false,
        snapshotUrl: 'snap_drr_finance',
        createdAt: 1723500000000
      }
    ],
    snapshots: SAMPLE_NAVIGATE_SNAPSHOTS
  },
  {
    demo: {
      id: 'demo_rotary_club_central',
      title: 'Rotary Club Central & Setting Goals for Rotaract Clubs',
      description: 'A guide on how to navigate through Rotary Club Central and set club goals to track your progress and achieve the Rotaract Club Excellence Award.',
      authorId: 'author_arun_teja',
      authorEmail: 'zeospec@gmail.com',
      createdAt: 1723100000000,
      updatedAt: 1723100000000,
      stepOrder: ['step_fin_1', 'step_fin_2'],
      isPublished: true,
      publishedManifestUrl: 'https://pub-tour.r2.dev/demos/demo_rotary_club_central/manifest.json',
      tags: ['Club Leader Access', 'DRR Access', 'Rotary Central', 'Goals'],
      theme: {
        primaryColor: '#0c3c60',
        badgeColor: '#e3a935',
        showBackdrop: true,
        showStepCount: true,
        pulseAnimation: true
      }
    },
    steps: [
      {
        id: 'step_fin_1',
        stepNumber: 1,
        title: 'Goal Center Navigation',
        description: 'Access the Rotary Club Central dashboard to set your annual club goals for service projects, membership growth, and foundation giving.',
        targetSelector: '#stat-current-balance',
        targetCoordinates: { x: 30, y: 150, width: 340, height: 110, scrollX: 0, scrollY: 0 },
        placement: 'bottom',
        triggerType: 'click',
        buttonText: 'Next: Goal Tracking',
        showBackButton: false,
        snapshotUrl: 'snap_myrotary_finance',
        createdAt: 1723100000000
      },
      {
        id: 'step_fin_2',
        stepNumber: 2,
        title: 'Submit Goals for Club Excellence Award',
        description: 'Enter targeted metrics for your club and click Save to synchronize with Rotary International district records.',
        targetSelector: '#invoice-row-2025-1',
        targetCoordinates: { x: 30, y: 360, width: 1080, height: 60, scrollX: 0, scrollY: 0 },
        placement: 'top',
        triggerType: 'click',
        buttonText: 'Finish Guide',
        showBackButton: true,
        snapshotUrl: 'snap_myrotary_finance',
        createdAt: 1723100100000
      }
    ],
    snapshots: SAMPLE_NAVIGATE_SNAPSHOTS
  }
];

export const DEFAULT_DEMOS = DEFAULT_DEMO_FIXTURES;

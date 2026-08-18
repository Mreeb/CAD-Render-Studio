import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Custom canvas to dynamically draw running headers and footers with total page counts."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Suppress headers on Cover/Title Page
        if self._pageNumber > 1:
            # Header
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(HexColor("#667180"))
            self.drawString(54, 750, "CAD RENDER STUDIO — USER INSTRUCTION MANUAL")
            self.setStrokeColor(HexColor("#252C37"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

            # Footer
            self.setFont("Helvetica", 8)
            self.setFillColor(HexColor("#667180"))
            self.drawString(54, 36, "Confidential & Proprietary — Product Operations Engine")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(558, 36, page_text)
            self.line(54, 48, 558, 48)

        self.restoreState()

def build_pdf_manual(output_filename="CAD_Render_Studio_User_Manual.pdf"):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    c_cobalt = HexColor("#4F7CFF")
    c_text_dark = HexColor("#121720")
    c_border = HexColor("#252C37")

    # Custom Typography Styles
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=HexColor("#121720"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=HexColor("#4F7CFF"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=HexColor("#252C37"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=HexColor("#121720")
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=9,
        leading=12,
        textColor=HexColor("#4F7CFF")
    )

    story = []

    # Title Banner Block
    banner_data = [
        [
            Paragraph("<b>CAD RENDER STUDIO</b>", ParagraphStyle('B1', fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=colors.white)),
            Paragraph("<b>USER INSTRUCTION MANUAL</b>", ParagraphStyle('B2', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=HexColor("#4F7CFF"), alignment=2))
        ],
        [
            Paragraph("AI-Powered Engineering Product CAD Reconstruction Engine", ParagraphStyle('B3', fontName='Helvetica', fontSize=10, leading=14, textColor=HexColor("#929CAA"))),
            Paragraph("Version 1.0 (Zero-Dependency Executable)", ParagraphStyle('B4', fontName='Helvetica', fontSize=9, leading=12, textColor=HexColor("#929CAA"), alignment=2))
        ]
    ]
    banner_table = Table(banner_data, colWidths=[330, 174])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#0D1118")),
        ('PADDING', (0,0), (-1,-1), 14),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,0), 2),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 14))

    # Welcome & Overview Box
    intro_p = Paragraph(
        "Welcome to <b>CAD Render Studio</b>! This software automatically downloads product photos, reconstructs high-precision 3D CAD renders using OpenAI AI technology, and organizes production files into your CAD catalog.<br/><br/>"
        "This standalone version is <b>100% self-contained</b>. You do not need to install Python, Node.js, Git, or any coding tools. Everything runs directly from the application folder.",
        body_style
    )
    story.append(intro_p)
    story.append(Spacer(1, 10))

    # Table of Contents Summary
    story.append(Paragraph("Quick Navigation", h2_style))
    toc_data = [
        ["1. Getting Started & Launching", "3. Complete Feature Walkthrough"],
        ["2. OpenAI API Key Setup & Configuration", "4. Output Folders & Troubleshooting"]
    ]
    toc_table = Table([[Paragraph(c, body_style) for c in row] for row in toc_data], colWidths=[252, 252])
    toc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#F4F6F8")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#E2E8F0")),
    ]))
    story.append(toc_table)
    story.append(Spacer(1, 14))

    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#E2E8F0"), spaceAfter=14))

    # SECTION 1: Getting Started
    story.append(Paragraph("1. Getting Started (Launching the Software)", h1_style))
    story.append(Paragraph(
        "Follow these 3 simple steps to start using CAD Render Studio on any Windows laptop:",
        body_style
    ))

    steps_data = [
        ["Step 1: Extract Zip", "Unzip the <b>CAD_Render_Studio.zip</b> folder anywhere on your computer."],
        ["Step 2: Double-Click .exe", "Open the unzipped folder and double-click <b>CAD_Render_Studio.exe</b>."],
        ["Step 3: Auto-Launch", "The application will launch and automatically open your web browser to <b>http://127.0.0.1:8000</b>."]
    ]
    steps_table = Table([[Paragraph(f"<b>{row[0]}</b>", code_style), Paragraph(row[1], body_style)] for row in steps_data], colWidths=[130, 374])
    steps_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#FFFFFF")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(steps_table)
    story.append(Spacer(1, 14))

    # SECTION 2: API Key Setup
    story.append(Paragraph("2. OpenAI API Key Setup & Configuration", h1_style))
    
    # Pre-configured Callout Box
    key_box_text = Paragraph(
        "<b>API Key Status: Enabled by Default</b><br/>"
        "Your package is pre-configured with a valid API key so you can start generating CAD renders immediately out of the box.<br/>"
        "If you ever need to view, change, or update your API key in the future, follow the guide below.",
        callout_style
    )
    key_table = Table([[key_box_text]], colWidths=[504])
    key_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#E0F2FE")),
        ('BORDER', (0,0), (-1,-1), 1, HexColor("#0284C7")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(key_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("How to Change or Add your API Key in the Software:", h2_style))
    story.append(Paragraph("<b>1. Open Settings:</b> Click on <b>Settings & Status</b> in the left sidebar menu.", bullet_style))
    story.append(Paragraph("<b>2. Enter API Key:</b> Paste your secret key into the <b>OpenAI API Key</b> input box (starts with <code>sk-proj-...</code>).", bullet_style))
    story.append(Paragraph("<b>3. Save:</b> Click <b>Save System Settings</b>. The system validates the key immediately.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("How to Get a New OpenAI API Key (Step-by-Step for Clients):", h2_style))
    
    api_guide = [
        ["1", "Go to OpenAI Platform", "Open your browser and visit <b>https://platform.openai.com</b>."],
        ["2", "Sign In / Register", "Log into your OpenAI account (or click Sign Up to create a free account)."],
        ["3", "Navigate to API Keys", "Click on the left menu icon &rarr; Select <b>API Keys</b> (or visit <b>platform.openai.com/api-keys</b>)."],
        ["4", "Create Secret Key", "Click the <b>+ Create new secret key</b> button, name it (e.g. 'CAD Studio'), and click Create."],
        ["5", "Copy & Paste", "Copy the generated key string (e.g., <code>sk-proj-xxxx...</code>) and paste it into CAD Render Studio Settings."]
    ]
    api_table = Table([
        [Paragraph(f"<b>{r[0]}</b>", ParagraphStyle('Num', fontName='Helvetica-Bold', fontSize=10, textColor=c_cobalt, alignment=1)),
         Paragraph(f"<b>{r[1]}</b>", ParagraphStyle('T1', fontName='Helvetica-Bold', fontSize=9, textColor=c_text_dark)),
         Paragraph(r[2], body_style)] for r in api_guide
    ], colWidths=[24, 140, 340])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#F8FAFC")),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(api_table)
    story.append(Spacer(1, 16))

    story.append(PageBreak()) # Clean section break to Feature Walkthrough

    # SECTION 3: Complete Feature Walkthrough
    story.append(Paragraph("3. Complete Feature Walkthrough", h1_style))
    story.append(Paragraph("The software sidebar is organized into 5 primary sections. Here is how each tab works:", body_style))
    story.append(Spacer(1, 4))

    # Feature 1: Downloader
    story.append(Paragraph("A. Image Downloader (Top Sidebar Item)", h2_style))
    story.append(Paragraph(
        "Automatically scrapes product photos from supplier databases using item serial numbers and populates your <b>DATA_DIRECTORY</b> folder.<br/>"
        "• <b>How to run</b>: Enter the number of new images to fetch (e.g., 100) and click <b>Start Downloader</b>.<br/>"
        "• <b>Live Progress</b>: Shows real-time progress text (e.g., <i>Searching: 11673</i>, <i>Downloading: 11673.png</i>).<br/>"
        "• <b>Refresh Button</b>: If the connection pauses, click the <b>Refresh</b> button to immediately sync the latest status.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Feature 2: Convert Renders
    story.append(Paragraph("B. Convert Renders (Default Landing Page)", h2_style))
    story.append(Paragraph(
        "Launches AI CAD reconstructions from original product photos.<br/>"
        "• <b>Automated Batch Mode</b>: Select quick batch buttons (1, 5, 10, 25, 100) or enter a custom amount to convert eligible images automatically.<br/>"
        "• <b>By AuVeCo Serial Number</b>: Enter a specific item serial number (e.g., <code>11130</code>) to convert an individual product.<br/>"
        "• <b>Render Quality Presets</b>: Choose <b>Medium Quality</b> (balanced speed & detail) or <b>High Quality</b> (maximum detail & surface definition).",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Feature 3: Live Queue
    story.append(Paragraph("C. Live Queue & Processing", h2_style))
    story.append(Paragraph(
        "Monitors active AI CAD reconstruction worker threads in real-time.<br/>"
        "• <b>Progress Ring & ETA</b>: Tracks percentage completion and estimated time remaining.<br/>"
        "• <b>Queue Controls</b>: Use <b>Pause Dispatch</b> to pause work, <b>Cancel Queued</b> to stop jobs, or <b>Retry Failed</b> to rerun any failed items.<br/>"
        "• <b>Manual Refresh</b>: Click <b>Refresh</b> anytime to force-update thread worker status instantly.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Feature 4: Review & Approval
    story.append(Paragraph("D. Review & Approval Workflow", h2_style))
    story.append(Paragraph(
        "Allows human review and quality verification before saving CAD renders into production catalog.<br/>"
        "• <b>Side-by-Side Comparison</b>: Shows original photo next to reconstructed CAD render.<br/>"
        "• <b>Zoom View</b>: Click <b>View</b> or hover over an image to open a high-resolution comparison modal.<br/>"
        "• <b>Select All & Bulk Approve</b>: Click <b>Select All</b> to highlight all items on page, then click <b>Approve Selected</b>. Approved renders are automatically moved into <code>CAD_DIRECTORY</code>.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Feature 5: Settings & Status
    story.append(Paragraph("E. Settings & Status", h2_style))
    story.append(Paragraph(
        "Provides system health diagnostics, database sync, and API configuration.<br/>"
        "• <b>Run Full Reconciliation</b>: Scans disk folders and Excel files to sync database records.<br/>"
        "• <b>API Key Management</b>: Update your secret key and test API connection status.",
        body_style
    ))
    story.append(Spacer(1, 14))

    # SECTION 4: Output Folders & Directory Guide (Grouped together)
    sec4_elements = [
        HRFlowable(width="100%", thickness=1, color=HexColor("#E2E8F0"), spaceAfter=14),
        Paragraph("4. Output Folders & Directory Guide", h1_style),
        Paragraph("All project files and images are managed inside the application folder:", body_style)
    ]
    folder_guide = [
        ["DATA_DIRECTORY/", "Source Photos", "Contains original product photos downloaded from suppliers or added manually (`.png` files)."],
        ["CAD_DIRECTORY/", "Production Renders", "Contains approved, high-resolution production CAD renders (`<serial>.png`)."],
        ["CAD_REVIEW_DIRECTORY/", "Review Renders", "Contains AI renders awaiting review and approval (`<serial>_review.png`)."],
        ["Fiverr List for Auveco-1.xlsx", "Master Mapping", "Excel spreadsheet linking AuVeCo serial numbers with Phantom item numbers."]
    ]
    folder_table = Table([
        [Paragraph(f"<b>{r[0]}</b>", code_style), Paragraph(f"<b>{r[1]}</b>", ParagraphStyle('F1', fontName='Helvetica-Bold', fontSize=9, textColor=c_text_dark)), Paragraph(r[2], body_style)] for r in folder_guide
    ], colWidths=[150, 110, 244])
    folder_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#FFFFFF")),
        ('PADDING', (0,0), (-1,-1), 7),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    sec4_elements.append(folder_table)
    sec4_elements.append(Spacer(1, 14))

    story.append(KeepTogether(sec4_elements))

    # SECTION 5: Troubleshooting & FAQs
    faq_elements = [
        Paragraph("5. Troubleshooting & FAQs", h1_style)
    ]
    faq_data = [
        ["Q: The web browser didn't open automatically.", "A: Open Chrome, Edge, or Firefox manually and type <b>http://127.0.0.1:8000</b> into the address bar."],
        ["Q: How do I stop or close the application?", "A: Simply close the browser tab or close the command window."],
        ["Q: A download or queue progress bar paused.", "A: Click the <b>Refresh</b> button on the top right of the page to force-sync status."],
        ["Q: I manually added images into DATA_DIRECTORY.", "A: Go to <b>Settings & Status</b> and click <b>Run Full Reconciliation</b> to sync database."]
    ]
    faq_table = Table([
        [Paragraph(f"<b>{r[0]}</b>", ParagraphStyle('Q1', fontName='Helvetica-Bold', fontSize=9.5, textColor=c_cobalt)),
         Paragraph(r[1], body_style)] for r in faq_data
    ], colWidths=[180, 324])
    faq_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#F8FAFC")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    faq_elements.append(faq_table)
    story.append(KeepTogether(faq_elements))

    # Build PDF Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF manual at {output_filename}")

if __name__ == "__main__":
    build_pdf_manual("CAD_Render_Studio_User_Manual.pdf")
    build_pdf_manual("dist/CAD_Render_Studio/CAD_Render_Studio_User_Manual.pdf")

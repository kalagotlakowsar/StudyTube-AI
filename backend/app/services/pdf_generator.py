import io
from typing import Dict, Any, List

def generate_study_pdf(
    video_data: Dict[str, Any],
    study_material: Dict[str, Any],
    quiz_data: Dict[str, Any] = None
) -> bytes:
    """
    Generates a PDF document for the study material using ReportLab.
    Falls back gracefully if ReportLab is not yet installed.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=45,
            leftMargin=45,
            topMargin=45,
            bottomMargin=45
        )

        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#1e1b4b'),
            spaceAfter=8
        )
        subtitle_style = ParagraphStyle(
            'DocSubTitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=15
        )
        h1_style = ParagraphStyle(
            'Heading1_Custom',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=15,
            leading=19,
            textColor=colors.HexColor('#312e81'),
            spaceBefore=12,
            spaceAfter=6
        )
        h2_style = ParagraphStyle(
            'Heading2_Custom',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=8,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            'Body_Custom',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#334155'),
            spaceAfter=6
        )
        quote_style = ParagraphStyle(
            'Quote_Custom',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=9.5,
            leading=13.5,
            textColor=colors.HexColor('#475569'),
            leftIndent=15,
            spaceAfter=8
        )

        story = []

        # Title & Subtitle Header
        video_title = video_data.get("title", "StudyTube AI Study Guide")
        channel = video_data.get("channel", "Educational Lecture")
        duration = video_data.get("duration", "N/A")
        mode = study_material.get("study_mode", "Detailed").title()

        story.append(Paragraph("StudyTube AI — Interactive Study Guide", subtitle_style))
        story.append(Paragraph(video_title, title_style))
        story.append(Paragraph(f"<b>Channel:</b> {channel} &nbsp;|&nbsp; <b>Duration:</b> {duration} &nbsp;|&nbsp; <b>Mode:</b> {mode}", subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#6366f1'), spaceAfter=14))

        # Executive Summary
        summary = study_material.get("summary", {})
        if summary:
            story.append(Paragraph("Executive Summary & Core Takeaways", h1_style))
            one_line = summary.get("one_line", "")
            if one_line:
                story.append(Paragraph(f"<b>TL;DR:</b> {one_line}", body_style))
            short_sum = summary.get("short", "")
            if short_sum:
                story.append(Paragraph(short_sum, body_style))

            takeaways = summary.get("key_takeaways", [])
            if takeaways:
                story.append(Paragraph("<b>Key Takeaways:</b>", body_style))
                for t in takeaways:
                    story.append(Paragraph(f"• {t}", body_style))
            story.append(Spacer(1, 10))

        # Key Concepts Table
        concepts = study_material.get("key_concepts", [])
        if concepts:
            story.append(Paragraph("Key Concepts & Definitions", h1_style))
            table_data = [["Concept", "Category", "Definition"]]
            for c in concepts:
                table_data.append([
                    Paragraph(f"<b>{c.get('name', '')}</b>", body_style),
                    Paragraph(c.get('category', 'General'), body_style),
                    Paragraph(c.get('definition', ''), body_style)
                ])

            t = Table(table_data, colWidths=[120, 80, 320])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e7ff')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e1b4b')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ]))
            story.append(t)
            story.append(Spacer(1, 12))

        # Structured Notes
        story.append(Paragraph("Comprehensive Notes", h1_style))
        raw_notes = study_material.get("notes_markdown", "")
        for line in raw_notes.split("\n"):
            line = line.strip()
            if not line:
                continue
            if line.startswith("# "):
                continue # Already have main title
            elif line.startswith("## "):
                story.append(Paragraph(line.replace("## ", ""), h1_style))
            elif line.startswith("### "):
                story.append(Paragraph(line.replace("### ", ""), h2_style))
            elif line.startswith("> "):
                story.append(Paragraph(line.replace("> ", ""), quote_style))
            elif line.startswith("- ") or line.startswith("* "):
                clean_bullet = line[2:].replace("**", "<b>").replace("__", "<b>")
                story.append(Paragraph(f"• {clean_bullet}", body_style))
            elif line.startswith("|") and line.endswith("|"):
                # Table row formatting skip or parse simply
                continue
            else:
                clean_p = line.replace("**", "<b>").replace("__", "<b>")
                story.append(Paragraph(clean_p, body_style))

        # Practice Quiz
        if quiz_data and "questions" in quiz_data:
            story.append(PageBreak())
            story.append(Paragraph("Practice Quiz & Review Questions", h1_style))
            questions = quiz_data.get("questions", [])
            for q in questions:
                q_num = q.get("id", 1)
                q_text = q.get("question", "")
                story.append(Paragraph(f"<b>Q{q_num}: {q_text}</b>", body_style))
                options = q.get("options", [])
                letters = ["A", "B", "C", "D", "E"]
                for idx, opt in enumerate(options):
                    letter_label = letters[idx] if idx < len(letters) else str(idx)
                    story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;{letter_label}. {opt}", body_style))
                story.append(Spacer(1, 4))

            # Answer Key
            story.append(Spacer(1, 10))
            story.append(Paragraph("Answer Key & Explanations", h2_style))
            for q in questions:
                q_num = q.get("id", 1)
                c_idx = q.get("correct_answer_index", 0)
                letters = ["A", "B", "C", "D", "E"]
                letter_ans = letters[c_idx] if c_idx < len(letters) else str(c_idx)
                exp = q.get("explanation", "")
                story.append(Paragraph(f"<b>Q{q_num}: ({letter_ans})</b> — {exp}", body_style))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    except Exception as e:
        print(f"ReportLab PDF generation error: {e}")
        # Fallback to simple plain text / raw format bytes
        fallback_text = f"StudyTube AI Study Guide\nTitle: {video_data.get('title', '')}\n\n{study_material.get('notes_markdown', '')}"
        return fallback_text.encode("utf-8")

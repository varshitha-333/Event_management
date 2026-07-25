import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

const execAsync = promisify(exec);

export interface CompilationResult {
  success: boolean;
  pdfPath?: string;
  texPath?: string;
  error?: string;
}

export async function compileProposalLatex(
  jsonData: any,
  outputDir: string
): Promise<CompilationResult> {
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Generate LaTeX content from template
    const latexContent = generateProposalLatex(jsonData);
    
    // Write .tex file
    const texPath = join(outputDir, `proposal_${jsonData.eventId || 'temp'}.tex`);
    await writeFile(texPath, latexContent, 'utf-8');

    // Compile to PDF
    const pdfPath = texPath.replace('.tex', '.pdf');
    
    try {
      await execAsync(`pdflatex -interaction=nonstopmode -output-directory="${outputDir}" "${texPath}"`);
      await execAsync(`pdflatex -interaction=nonstopmode -output-directory="${outputDir}" "${texPath}"`); // Run twice for references
    } catch (compileError) {
      // Clean up .tex file on error
      await unlink(texPath).catch(() => {});
      return {
        success: false,
        error: `LaTeX compilation failed: ${compileError instanceof Error ? compileError.message : 'Unknown error'}`
      };
    }

    return {
      success: true,
      pdfPath,
      texPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function compileReportLatex(
  jsonData: any,
  outputDir: string
): Promise<CompilationResult> {
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Generate LaTeX content from template
    const latexContent = generateReportLatex(jsonData);
    
    // Write .tex file
    const texPath = join(outputDir, `report_${jsonData.eventId || 'temp'}.tex`);
    await writeFile(texPath, latexContent, 'utf-8');

    // Compile to PDF
    const pdfPath = texPath.replace('.tex', '.pdf');
    
    try {
      await execAsync(`pdflatex -interaction=nonstopmode -output-directory="${outputDir}" "${texPath}"`);
      await execAsync(`pdflatex -interaction=nonstopmode -output-directory="${outputDir}" "${texPath}"`); // Run twice for references
    } catch (compileError) {
      // Clean up .tex file on error
      await unlink(texPath).catch(() => {});
      return {
        success: false,
        error: `LaTeX compilation failed: ${compileError instanceof Error ? compileError.message : 'Unknown error'}`
      };
    }

    return {
      success: true,
      pdfPath,
      texPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function generateProposalLatex(data: any): string {
  const academicYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return `
\\documentclass[12pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{hyperref}
\\usepackage{longtable}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{setspace}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small JAIN (Deemed-to-be University)\\\\Faculty of Engineering and Technology}
\\fancyhead[R]{\\small ${data.clubName || ''}\\\\${data.department || ''}}
\\fancyfoot[C]{\\thepage}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]

\\begin{document}

\\begin{center}
\\includegraphics[width=2cm]{jain_logo.png}\\\\[0.5cm]
\\textbf{\\Large JAIN (Deemed-to-be University)}\\\\[0.2cm]
\\textbf{Faculty of Engineering and Technology}\\\\[0.5cm]
\\textbf{${data.clubName || ''}}\\\\
${data.department || ''}\\\\[0.5cm]
\\textbf{\\Large EVENT PROPOSAL}\\\\[0.2cm]
Academic Year: ${academicYear}\\\\[0.5cm]
Prepared By: ${data.facultyCoordinator || ''}\\\\
Date: ${currentDate}
\\end{center}

\\section*{Club / Unit}
\\textbf{Club Name:} ${data.clubName || ''}\\\\
\\textbf{Department:} ${data.department || ''}

\\section*{Approval Section}
This proposal is submitted for academic and administrative review and approval. All operational details, logistics, scheduling, publicity, and resource planning will be finalized upon formal approval by the competent authorities.

\\subsection*{Faculty Coordinator}
${data.facultyCoordinator || ''}

\\subsection*{Club Head}
${data.clubHead || 'TBD'}

\\subsection*{Department Head}
${data.departmentHead || 'TBD'}

\\newpage

\\section{Event Details}
\\begin{tabular}{|p{0.3\\textwidth}|p{0.6\\textwidth}|}
\\hline
\\textbf{Event Name} & ${data.eventName || ''} \\\\
\\hline
\\textbf{Event Type} & ${data.eventType || ''} \\\\
\\hline
\\textbf{Theme} & ${data.eventTheme || ''} \\\\
\\hline
\\textbf{Proposed Date} & ${new Date(data.proposedDate).toLocaleDateString('en-IN')} \\\\
\\hline
\\textbf{Time} & ${data.eventTime || ''} \\\\
\\hline
\\textbf{Venue} & ${data.venue || ''} \\\\
\\hline
\\textbf{Mode} & ${data.mode || ''} \\\\
\\hline
\\end{tabular}

\\section{Organizing Team}
\\begin{tabular}{|p{0.3\\textwidth}|p{0.6\\textwidth}|}
\\hline
\\textbf{Faculty Coordinator} & ${data.facultyCoordinator || ''} \\\\
\\hline
\\textbf{Student Coordinator(s)} & ${data.studentCoordinators?.join(', ') || ''} \\\\
\\hline
\\textbf{Club Name} & ${data.clubName || ''} \\\\
\\hline
\\textbf{Department} & ${data.department || ''} \\\\
\\hline
\\end{tabular}

\\section{About the Event}
${data.description || ''}

\\section{Objectives}
\\begin{itemize}
${data.objectives?.map((obj: string) => `\\item ${obj}`).join('\\n') || '\\item TBD'}
\\end{itemize}

\\section{Target Audience}
${data.targetAudience || ''}

\\section{Expected Number of Participants}
${data.expectedParticipants || 0}

\\section{Resource Person Details}
\\begin{tabular}{|p{0.3\\textwidth}|p{0.6\\textwidth}|}
\\hline
\\textbf{Name} & ${data.resourcePerson?.name || 'TBD'} \\\\
\\hline
\\textbf{Designation} & ${data.resourcePerson?.designation || 'TBD'} \\\\
\\hline
\\textbf{Organization} & ${data.resourcePerson?.organization || 'TBD'} \\\\
\\hline
\\textbf{Short Bio} & ${data.resourcePerson?.shortBio || 'TBD'} \\\\
\\hline
\\end{tabular}

\\section{Event Schedule}
\\begin{tabular}{|p{0.2\\textwidth}|p{0.4\\textwidth}|p{0.3\\textwidth}|}
\\hline
\\textbf{Time} & \\textbf{Activity} & \\textbf{Speaker / Lead} \\\\
\\hline
${data.eventSchedule?.map((sched: any) => `${sched.time} & ${sched.activity} & ${sched.speaker} \\\\ \\hline`).join('\\n') || 'TBD & TBD & TBD \\\\ \\hline'}
\\end{tabular}

\\section{Budget Estimation}
\\begin{tabular}{|c|p{0.6\\textwidth}|r|}
\\hline
\\textbf{S.No.} & \\textbf{Particulars} & \\textbf{Estimated Amount} \\\\
\\hline
${data.budgetItems?.map((item: any, i: number) => `${i + 1} & ${item.item} & ₹${item.amount} \\\\ \\hline`).join('\\n') || '1 & TBD & ₹0 \\\\ \\hline'}
\\textbf{Total} & \\textbf{Total Estimated Budget} & \\textbf{₹${data.budgetItems?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0}} \\\\
\\hline
\\end{tabular}

\\section{Logistics Required}
\\begin{tabular}{|p{0.4\\textwidth}|p{0.5\\textwidth}|}
\\hline
\\textbf{Item} & \\textbf{Requirement / Remarks} \\\\
\\hline
Projector & ${data.logistics?.projector ? 'Required' : 'Not Required'} \\\\
\\hline
Mic & ${data.logistics?.mic ? 'Required' : 'Not Required'} \\\\
\\hline
Internet & ${data.logistics?.internet ? 'Required' : 'Not Required'} \\\\
\\hline
Certificates & ${data.logistics?.certificates ? 'Required' : 'Not Required'} \\\\
\\hline
Refreshments & ${data.logistics?.refreshments ? 'Required' : 'Not Required'} \\\\
\\hline
Photography & ${data.logistics?.photography ? 'Required' : 'Not Required'} \\\\
\\hline
Volunteers & ${data.logistics?.volunteers ? 'Required' : 'Not Required'} \\\\
\\hline
\\end{tabular}

\\section{Publicity Plan}
${data.publicityPlan || ''}

\\section{Expected Outcomes}
\\begin{itemize}
${data.expectedOutcomes?.map((outcome: string) => `\\item ${outcome}`).join('\\n') || '\\item TBD'}
\\end{itemize}

\\section{Risks \\& Mitigation}
${data.risksAndMitigation || ''}

\\section{Approval Signatures}
\\subsection*{Faculty Coordinator}
${data.facultyCoordinator || ''}

\\subsection*{Club Head}
${data.clubHead || 'TBD'}

\\subsection*{Department Head}
${data.departmentHead || 'TBD'}

\\section{QR Code / Registration Link}
\\begin{center}
\\includegraphics[width=3cm]{qr_code.png}\\\\[0.2cm]
\\textbf{Registration Link:} \\href{${data.registrationLink || '#'}}${data.registrationLink || 'TBD'}\\\\
\\textbf{Brochure Link:} \\href{${data.brochureLink || '#'}}${data.brochureLink || 'TBD'}
\\end{center}

\\end{document}
`;
}

function generateReportLatex(data: any): string {
  const academicYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return `
\\documentclass[12pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{hyperref}
\\usepackage{longtable}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{setspace}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\small JAIN (Deemed-to-be University)\\\\Faculty of Engineering and Technology}
\\fancyhead[R]{\\small ${data.clubName || ''}\\\\${data.department || ''}}
\\fancyfoot[C]{\\thepage}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]

\\begin{document}

\\begin{center}
\\includegraphics[width=2cm]{jain_logo.png}\\\\[0.5cm]
\\textbf{\\Large JAIN (Deemed-to-be University)}\\\\[0.2cm]
\\textbf{Faculty of Engineering and Technology}\\\\[0.5cm]
\\textbf{${data.clubName || ''}}\\\\
${data.department || ''}\\\\[0.5cm]
\\textbf{\\Large POST EVENT REPORT}\\\\[0.2cm]
Academic Year: ${academicYear}\\\\[0.5cm]
Prepared By: ${data.facultyCoordinator || ''}\\\\
Date: ${currentDate}
\\end{center}

\\section*{Club / Unit}
\\textbf{Club Name:} ${data.clubName || ''}\\\\
\\textbf{Department:} ${data.department || ''}

\\section*{Official documentation template for event reporting and archival records}

\\section{Event Summary}
\\begin{tabular}{|p{0.3\\textwidth}|p{0.6\\textwidth}|}
\\hline
\\textbf{Event Name} & ${data.eventName || ''} \\\\
\\hline
\\textbf{Date} & ${new Date(data.date).toLocaleDateString('en-IN')} \\\\
\\hline
\\textbf{Time} & ${data.time || ''} \\\\
\\hline
\\textbf{Venue} & ${data.venue || ''} \\\\
\\hline
\\textbf{Event Type} & ${data.eventType || ''} \\\\
\\hline
\\textbf{Organizer} & ${data.organizer || ''} \\\\
\\hline
\\textbf{Faculty Coordinator} & ${data.facultyCoordinator || ''} \\\\
\\hline
\\textbf{Student Coordinator} & ${data.studentCoordinators?.join(', ') || ''} \\\\
\\hline
\\textbf{Resource Person} & ${data.resourcePerson?.name || 'TBD'} \\\\
\\hline
\\textbf{Number of Participants} & ${data.actualParticipants || 0} \\\\
\\hline
\\end{tabular}

\\section{About the Event}
${data.description || ''}

\\section{Objectives}
\\begin{itemize}
${data.objectives?.map((obj: string) => `\\item ${obj}`).join('\\n') || '\\item TBD'}
\\end{itemize}

\\section{Event Proceedings}
${data.eventProceedings || ''}

\\section{Key Highlights}
\\begin{itemize}
${data.keyHighlights?.map((highlight: string) => `\\item ${highlight}`).join('\\n') || '\\item TBD'}
\\end{itemize}

\\section{Learning Outcomes}
\\begin{itemize}
${data.learningOutcomes?.map((outcome: string) => `\\item ${outcome}`).join('\\n') || '\\item TBD'}
\\end{itemize}

\\section{Speaker Details}
\\begin{tabular}{|p{0.3\\textwidth}|p{0.6\\textwidth}|}
\\hline
\\textbf{Name} & ${data.resourcePerson?.name || 'TBD'} \\\\
\\hline
\\textbf{Designation} & ${data.resourcePerson?.designation || 'TBD'} \\\\
\\hline
\\textbf{Organization} & ${data.resourcePerson?.organization || 'TBD'} \\\\
\\hline
\\end{tabular}

\\section{Participant Statistics}
\\begin{tabular}{|p{0.4\\textwidth}|r|}
\\hline
\\textbf{Category} & \\textbf{Count} \\\\
\\hline
Registered & ${data.participantStats?.registered || 0} \\\\
\\hline
Attended & ${data.participantStats?.attended || 0} \\\\
\\hline
Male & ${data.participantStats?.male || 0} \\\\
\\hline
Female & ${data.participantStats?.female || 0} \\\\
\\hline
Others & ${data.participantStats?.others || 0} \\\\
\\hline
Certificates Issued & ${data.participantStats?.certificatesIssued || 0} \\\\
\\hline
\\end{tabular}

\\section{Feedback Summary}
${data.feedbackSummary || ''}

\\section{Budget Utilized}
\\begin{tabular}{|c|p{0.6\\textwidth}|r|}
\\hline
\\textbf{S.No.} & \\textbf{Particulars} & \\textbf{Amount} \\\\
\\hline
${data.budgetUtilized?.map((item: any, i: number) => `${i + 1} & ${item.item} & ₹${item.amount} \\\\ \\hline`).join('\\n') || '1 & TBD & ₹0 \\\\ \\hline'}
\\textbf{Total} & \\textbf{Total Budget Utilized} & \\textbf{₹${data.budgetUtilized?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0}} \\\\
\\hline
\\end{tabular}

\\section{Media Coverage}
${data.mediaCoverage || ''}

\\section{Deliverables}
\\begin{tabular}{|p{0.3\\textwidth}|p{0.6\\textwidth}|}
\\hline
\\textbf{Deliverable} & \\textbf{Details / Link} \\\\
\\hline
Certificates & Issued \\\\
\\hline
Recording & \\href{${data.links?.recordingLink || '#'}}${data.links?.recordingLink || 'TBD'} \\\\
\\hline
Presentation & \\href{${data.links?.presentationLink || '#'}}${data.links?.presentationLink || 'TBD'} \\\\
\\hline
Attendance & \\href{${data.links?.attendanceLink || '#'}}${data.links?.attendanceLink || 'TBD'} \\\\
\\hline
Feedback & \\href{${data.links?.feedbackLink || '#'}}${data.links?.feedbackLink || 'TBD'} \\\\
\\hline
\\end{tabular}

\\section{Drive Link}
\\textbf{Google Drive Link:} \\href{${data.links?.driveLink || '#'}}${data.links?.driveLink || 'TBD'}

\\section{Registration Link}
\\textbf{Registration Link:} \\href{${data.links?.registrationLink || '#'}}${data.links?.registrationLink || 'TBD'}

\\section{Attendance Link}
\\textbf{Attendance Link:} \\href{${data.links?.attendanceLink || '#'}}${data.links?.attendanceLink || 'TBD'}

\\section{Social Media Links}
\\begin{itemize}
${data.socialMediaLinks?.map((link: string) => `\\item \\href{${link}}${link}`).join('\\n') || '\\item TBD'}
\\end{itemize}

\\section{Future Recommendations}
${data.futureRecommendations || ''}

\\section{Conclusion}
${data.conclusion || ''}

\\section{Signatures}
\\subsection*{Faculty Coordinator}
${data.facultyCoordinator || ''}

\\subsection*{Club Head}
${data.clubHead || 'TBD'}

\\subsection*{Department Head}
${data.departmentHead || 'TBD'}

\\section{Photo Gallery}
\\begin{center}
${data.photos && data.photos.length > 0 
  ? data.photos.map((photo: any, i: number) => {
      const isFirst = i === 0;
      const isEven = i % 2 === 0;
      const hasNext = i < data.photos.length - 1;
      
      let photoLine = `\\includegraphics[width=0.45\\textwidth]{${photo.url}}`;
      if (isEven && hasNext) {
        photoLine += ' \\hfill ';
      } else {
        photoLine += '\\\\[0.3cm]\n\\textbf{Photo ' + (i + 1) + ':} ' + (photo.caption || '');
        if (isEven && hasNext) {
          photoLine += ' \\hfill \\textbf{Photo ' + (i + 2) + ':} ' + (data.photos[i + 1]?.caption || '');
        } else {
          photoLine += '\\\\[0.5cm]';
        }
      }
      return photoLine;
    }).join('\n')
  : '\\textbf{No photos uploaded}'
}
\\end{center}

\\section{Attachments}
\\begin{tabular}{|p{0.3\\textwidth}|p{0.6\\textwidth}|}
\\hline
\\textbf{Google Drive Link} & \\href{${data.links?.driveLink || '#'}}${data.links?.driveLink || 'TBD'} \\\\
\\hline
\\textbf{Additional Documents} & See Drive Link \\\\
\\hline
\\textbf{Contact Information} & ${data.facultyCoordinator || ''} \\\\
\\hline
\\end{tabular}

\\begin{center}
\\includegraphics[width=3cm]{qr_code.png}\\\\[0.2cm]
\\textbf{Scan for more resources}
\\end{center}

\\end{document}
`;
}

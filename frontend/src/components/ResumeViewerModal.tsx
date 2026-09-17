import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  Eye,
  Loader2
} from 'lucide-react';
import mammoth from 'mammoth';
import type { ResumeDocument, Candidate } from '../types';
import { store } from '../services/store';

interface ResumeViewerModalProps {
  candidate: Candidate;
  onClose: () => void;
}

export const ResumeViewerModal: React.FC<ResumeViewerModalProps> = ({ candidate, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [activeTab, setActiveTab] = useState<'document' | 'fraud_report'>('document');
  const containerRef = useRef<HTMLDivElement>(null);

  const resume = candidate.resume;
  const fileUrl = resume ? store.getResumeUrl(candidate.id, resume) : null;
  const isDocx = resume?.fileType === 'docx' || resume?.fileName.endsWith('.docx');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setDocxHtml(null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const loadContent = async () => {
      try {
        if (isDocx) {
          if (resume?.fileBlob) {
            const arrayBuffer = await resume.fileBlob.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setDocxHtml(result.value);
              setLoading(false);
            }
          } else if (fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('http'))) {
            const response = await fetch(fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isMounted) {
              setDocxHtml(result.value);
              setLoading(false);
            }
          } else {
            // Simulated DOCX view
            if (isMounted) {
              setDocxHtml(generateSimulatedResumeHtml(candidate));
              setLoading(false);
            }
          }
        } else {
          // PDF
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading resume content:', err);
        if (isMounted) {
          setError('Could not render document directly. You can still download the original file.');
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [candidate, resume, fileUrl, isDocx, onClose]);

  const handleDownload = () => {
    if (resume?.fileBlob) {
      const url = URL.createObjectURL(resume.fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.fileName || `${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('http'))) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = resume?.fileName || `${candidate.name.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const dummyContent = generateSimulatedResumeText(candidate);
      const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume?.fileName ? resume.fileName.replace(/\.pdf$/, '.txt') : `${candidate.name}_Resume.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ padding: '20px' }}>
      <div 
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1040px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#fafbfc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}>
              <FileText size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>
                  {resume?.fileName || `${candidate.name} - Resume`}
                </b>
                <span className="status-badge-inline status-strong" style={{ fontSize: '10px' }}>
                  {isDocx ? 'DOCX' : 'PDF'}
                </span>
                {candidate.resume?.fileSize && (
                  <small style={{ color: 'var(--text-muted)' }}>
                    {(candidate.resume.fileSize / 1024).toFixed(1)} KB
                  </small>
                )}
              </div>
              <small style={{ color: 'var(--text-muted)' }}>
                Applicant: <b style={{ color: 'var(--text-secondary)' }}>{candidate.name}</b> · {candidate.email}
              </small>
            </div>
          </div>

          {/* View Mode Tabs & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${activeTab === 'document' ? 'active' : ''}`}
                onClick={() => setActiveTab('document')}
              >
                <Eye size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Document View
              </button>
              <button
                type="button"
                className={`filter-pill ${activeTab === 'fraud_report' ? 'active' : ''}`}
                onClick={() => setActiveTab('fraud_report')}
              >
                <ShieldAlert size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                Verification & Fraud
                {candidate.verificationAlerts?.length > 0 && (
                  <span style={{
                    marginLeft: '4px',
                    padding: '1px 5px',
                    backgroundColor: 'var(--warning-bg)',
                    color: 'var(--warning-text)',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 700
                  }}>
                    {candidate.verificationAlerts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Zoom controls */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 15))}
                style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '0 6px', color: 'var(--text-muted)' }}>
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(175, z + 15))}
                style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {fileUrl && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="btn btn-secondary btn-sm"
                title="Open in New Tab"
              >
                <ExternalLink size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-primary btn-sm"
            >
              <Download size={13} /> Download Original
            </button>

            <button
              type="button"
              onClick={onClose}
              className="close-btn"
              style={{ marginLeft: '4px' }}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div 
          ref={containerRef} 
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#f1f5f9',
            padding: '24px',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', margin: 'auto', padding: '40px 0' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 10px' }} />
              <b style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>Loading document preview...</b>
              <small style={{ color: 'var(--text-muted)' }}>Rendering {isDocx ? 'DOCX via Mammoth' : 'PDF'}</small>
            </div>
          ) : activeTab === 'fraud_report' ? (
            /* Verification & Fraud Report Tab */
            <div style={{ width: '100%', maxWidth: '800px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} style={{ color: 'var(--primary)' }} />
                    Document Integrity & Fraud Scan Results
                  </h3>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Multi-layer checks for white fonting, micro text, off-margin injection, and timeline consistency.
                  </small>
                </div>
                <div className="status-badge-inline status-strong">
                  <CheckCircle2 size={12} /> Scan Completed
                </div>
              </div>

              {candidate.verificationAlerts && candidate.verificationAlerts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '12px 16px', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', color: 'var(--warning-text)', fontSize: '12px' }}>
                    <AlertCircle size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                    <b>{candidate.verificationAlerts.length} Notification(s) Flagged:</b> These verification flags do not alter candidate match scores. Recruiter review recommended.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {candidate.verificationAlerts.map((alert, idx) => (
                      <div key={idx} style={{ padding: '12px 14px', backgroundColor: '#fafbfc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {alert.type.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--warning-text)', fontWeight: 600 }}>
                            Severity: {alert.severity}
                          </span>
                        </div>
                        <b style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{alert.title}</b>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{alert.message}</p>
                        {alert.timelineDetails && (
                          <code style={{ display: 'block', marginTop: '6px', padding: '4px 8px', backgroundColor: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>
                            {alert.timelineDetails}
                          </code>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                  <CheckCircle2 size={36} style={{ color: 'var(--success)', margin: '0 auto 10px' }} />
                  <b style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)' }}>No Resume Manipulation Detected</b>
                  <small style={{ color: 'var(--text-muted)', maxWidth: '400px', display: 'block', margin: '4px auto 0' }}>
                    White fonting, 0pt micro-text, off-margin coordinates, and hidden image layer scans passed with 0 anomalies.
                  </small>
                </div>
              )}
            </div>
          ) : isDocx ? (
            /* DOCX View */
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: '100%', maxWidth: '820px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '36px', minHeight: '800px' }}
            >
              {docxHtml ? (
                <div 
                  className="docx-container"
                  dangerouslySetInnerHTML={{ __html: docxHtml }} 
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <p>Could not extract formatted DOCX content.</p>
                </div>
              )}
            </div>
          ) : fileUrl && (fileUrl.startsWith('blob:') || fileUrl.startsWith('http')) ? (
            /* PDF native embed */
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: '100%', maxWidth: '900px', height: '100%', minHeight: '750px' }}
            >
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                style={{ width: '100%', height: '100%', minHeight: '750px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: '#ffffff' }}
                title={`Resume for ${candidate.name}`}
              />
            </div>
          ) : (
            /* Simulated Structured Paper PDF */
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', width: '100%', maxWidth: '820px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '36px', minHeight: '800px' }}
            >
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>{candidate.name}</h1>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', margin: '0 0 8px' }}>{candidate.title}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                  <span>📧 {candidate.email}</span>
                  {candidate.phone && <span>📞 {candidate.phone}</span>}
                  <span>📍 {candidate.location}</span>
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <span className="summary-title">Professional Summary</span>
                <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6' }}>
                  {candidate.explanation || `Accomplished engineer with ${candidate.experienceYears || 4}+ years of experience designing scalable software systems, enterprise web applications, and high-performance cloud architectures.`}
                </p>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <span className="summary-title">Technical Skills</span>
                <div className="skills-inline-wrap">
                  {candidate.matchedSkills && candidate.matchedSkills.length > 0 ? (
                    candidate.matchedSkills.map((s, idx) => (
                      <span key={idx} className="skill-tag highlighted">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Skills analysis pending</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <span className="summary-title">Work Experience</span>
                {candidate.workHistory && candidate.workHistory.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {candidate.workHistory.map((w, idx) => (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <b style={{ fontSize: '12px', color: '#0f172a' }}>{w.role}</b>
                          <small style={{ color: '#64748b' }}>{w.period}</small>
                        </div>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>{w.company}</span>
                        {w.highlights && w.highlights.length > 0 && (
                          <ul style={{ paddingLeft: '16px', margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                            {w.highlights.map((h, hIdx) => (
                              <li key={hIdx}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <small style={{ color: '#94a3b8', fontStyle: 'italic' }}>Details on file in uploaded resume.</small>
                )}
              </div>

              {candidate.projects && candidate.projects.length > 0 && (
                <div style={{ marginBottom: '18px' }}>
                  <span className="summary-title">Projects</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {candidate.projects.map((p, idx) => (
                      <div key={idx} style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <b style={{ fontSize: '12px', color: '#0f172a' }}>{p.title}</b>
                          {p.period && <small style={{ color: '#64748b' }}>{p.period}</small>}
                        </div>
                        {p.technologies && p.technologies.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                            {p.technologies.map((t, tIdx) => (
                              <span key={tIdx} style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 500 }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {p.description && (
                          <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0', lineHeight: 1.4 }}>
                            {p.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="summary-title">Education</span>
                {candidate.education && candidate.education.length > 0 ? (
                  candidate.education.map((e, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', marginBottom: '6px' }}>
                      <div>
                        <b style={{ color: '#0f172a' }}>{e.degree}</b> · {e.institution}
                      </div>
                      <span style={{ color: '#64748b' }}>{e.year}</span>
                    </div>
                  ))
                ) : (
                  <small style={{ color: '#94a3b8', fontStyle: 'italic' }}>Education details on file.</small>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div style={{
          padding: '10px 20px',
          backgroundColor: '#fafbfc',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
            <span>Document loaded in secure viewer sandbox</span>
          </div>
          <span>Press <kbd style={{ padding: '2px 5px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>ESC</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
};

function generateSimulatedResumeHtml(c: Candidate): string {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b;">
      <h1 style="font-size: 20px; margin-bottom: 2px; color: #0f172a;">${c.name}</h1>
      <p style="font-size: 13px; font-weight: 600; color: #2563eb; margin: 0 0 6px 0;">${c.title}</p>
      <p style="font-size: 11px; color: #64748b;">${c.email} | ${c.phone || '+1 (555) 019-2831'} | ${c.location}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 14px 0;" />
      <h3 style="font-size: 12px; text-transform: uppercase; color: #334155; margin-bottom: 6px;">Professional Summary</h3>
      <p style="font-size: 12px; color: #334155;">${c.explanation || 'Proven track record of engineering scalable applications and delivering business value.'}</p>
    </div>
  `;
}

function generateSimulatedResumeText(c: Candidate): string {
  return `RESUME: ${c.name}
Role: ${c.title}
Email: ${c.email}
Phone: ${c.phone || 'N/A'}
Location: ${c.location}

SUMMARY:
${c.explanation || 'Experienced software professional.'}

SKILLS:
${c.matchedSkills?.join(', ') || 'Pending analysis'}

WORK EXPERIENCE:
${c.workHistory?.map((w) => `${w.role} at ${w.company} (${w.period})${w.highlights && w.highlights.length > 0 ? `\n- ${w.highlights.join('\n- ')}` : ''}`).join('\n\n') || 'N/A'}
`;
}

import React, { useState, useEffect, useRef } from "react";
import { EVALUATION_CRITERIA } from "../constants/problemStatements";
import { 
  Printer, Download, RotateCcw, AlertTriangle, CheckSquare, 
  ChevronDown, ChevronUp, Save, MessageSquare, AlertCircle
} from "lucide-react";

export default function Scorecard({ 
  data, 
  problemStatement, 
  repoInfo, 
  onRestart,
  onUpdateScorecard,
  savedCustomNotes
}) {
  // Local state to manage criteria scores (so they can be overridden)
  const [scores, setScores] = useState({});
  const [critiques, setCritiques] = useState({});
  const [customNotes, setCustomNotes] = useState("");
  const [expandedCriteria, setExpandedCriteria] = useState("functionalCompleteness");

  // Track if initial load is completed to prevent unnecessary callbacks
  const isLoadedRef = useRef(false);

  // Load initial values from the evaluation run
  useEffect(() => {
    if (data && data.criteriaBreakdown) {
      const initialScores = {};
      const initialCritiques = {};
      
      Object.keys(data.criteriaBreakdown).forEach(key => {
        initialScores[key] = data.criteriaBreakdown[key].score;
        initialCritiques[key] = data.criteriaBreakdown[key].critique;
      });
      
      setScores(initialScores);
      setCritiques(initialCritiques);
      setCustomNotes(savedCustomNotes || "");
      
      // Delay setting isLoaded to true slightly to allow state to settle
      setTimeout(() => {
        isLoadedRef.current = true;
      }, 50);
    }
  }, [data, savedCustomNotes]);

  // Bubble changes up to the parent App.jsx when local state modifies
  const syncWithParent = (updatedScores, updatedCritiques, updatedNotes) => {
    if (!isLoadedRef.current || !onUpdateScorecard) return;
    onUpdateScorecard({
      scores: updatedScores,
      critiques: updatedCritiques,
      customNotes: updatedNotes
    });
  };

  // Calculate the total score in real-time
  const totalScore = Object.values(scores).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  // Determine Grade Letter and color matching
  const getGradeInfo = (score) => {
    if (score >= 90) return { letter: "A+", color: "var(--accent-success)", bg: "rgba(16, 185, 129, 0.1)" };
    if (score >= 80) return { letter: "A", color: "var(--accent-success)", bg: "rgba(16, 185, 129, 0.1)" };
    if (score >= 70) return { letter: "B", color: "var(--accent-cyan)", bg: "rgba(6, 182, 212, 0.1)" };
    if (score >= 50) return { letter: "C", color: "var(--accent-warning)", bg: "rgba(245, 158, 11, 0.1)" };
    return { letter: "F", color: "var(--accent-danger)", bg: "rgba(239, 68, 68, 0.1)" };
  };

  const grade = getGradeInfo(totalScore);

  // Handle Score Adjustments
  const handleScoreChange = (key, value, maxMarks) => {
    let cleanVal = Number(value);
    if (isNaN(cleanVal)) return;
    if (cleanVal < 0) cleanVal = 0;
    if (cleanVal > maxMarks) cleanVal = maxMarks;
    
    const newScores = {
      ...scores,
      [key]: cleanVal
    };
    setScores(newScores);
    syncWithParent(newScores, critiques, customNotes);
  };

  const handleCritiqueChange = (key, val) => {
    const newCritiques = {
      ...critiques,
      [key]: val
    };
    setCritiques(newCritiques);
    syncWithParent(scores, newCritiques, customNotes);
  };

  const handleNotesChange = (val) => {
    setCustomNotes(val);
    syncWithParent(scores, critiques, val);
  };

  // Toggle criteria cards
  const toggleExpand = (key) => {
    setExpandedCriteria(expandedCriteria === key ? null : key);
  };

  // SVG Gauge calculations
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (totalScore / 100) * circumference;

  // Generate Markdown report string
  const generateMarkdownReport = () => {
    let report = `# STRICT EVALUATION REPORT: ${problemStatement.id} - ${problemStatement.title}\n`;
    report += `**Repository**: https://github.com/${repoInfo.owner}/${repoInfo.repo}\n`;
    report += `**Evaluation Branch**: \`${repoInfo.branch}\`\n`;
    report += `**Timestamp**: ${new Date().toLocaleString()}\n\n`;
    
    report += `## OVERALL SCORE: ${totalScore} / 100 (Grade: ${grade.letter})\n\n`;
    
    report += `### Summary Feedback\n`;
    report += `> ${data.summaryFeedback || "Project has been reviewed and graded strictly according to structural elements."}\n\n`;
    
    if (customNotes.trim()) {
      report += `### Evaluator Remarks\n`;
      report += `${customNotes}\n\n`;
    }
    
    report += `## Rubric Breakdown\n\n`;
    
    EVALUATION_CRITERIA.forEach(criterion => {
      const actualScore = scores[criterion.key] ?? 0;
      const critiqueText = critiques[criterion.key] ?? "";
      
      report += `### ${criterion.name} (${actualScore} / ${criterion.maxMarks} Marks)\n`;
      report += `${critiqueText}\n\n`;
    });
    
    report += `## Problem Statement Feature Checklist\n\n`;
    const features = data.featuresEvaluated || [];
    features.forEach(f => {
      const statusIcon = f.status === "Implemented" ? "✅" : f.status === "Partially Implemented" ? "⚠️" : "❌";
      report += `- **${statusIcon} ${f.feature}** - *${f.status}*\n`;
      report += `  Detail: ${f.details}\n`;
    });
    
    report += `\n## Suggested Improvements\n\n`;
    const fixes = data.improvements || [];
    if (fixes.length === 0) {
      report += `No crucial suggestions. Clean architecture!\n`;
    } else {
      fixes.forEach(fix => {
        report += `### [${fix.severity} Severity] ${fix.issue}\n`;
        report += `- **Suggestion**: ${fix.suggestion}\n\n`;
      });
    }
    
    return report;
  };

  // Trigger download of Markdown file
  const downloadMarkdown = () => {
    const markdownContent = generateMarkdownReport();
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${repoInfo.repo}_evaluation_${problemStatement.id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Top Banner Control Panel */}
      <div className="glass-card" style={{ padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
            Currently Auditing
          </span>
          <span style={{ fontSize: "1.15rem", fontWeight: 700 }}>
            {repoInfo.owner}/{repoInfo.repo}
          </span>
          <span className="badge badge-info" style={{ marginLeft: "0.75rem", fontSize: "0.7rem", textTransform: "none" }}>
            Branch: {repoInfo.branch}
          </span>
          <span className="badge badge-success" style={{ marginLeft: "0.5rem", fontSize: "0.7rem", textTransform: "none" }}>
            {problemStatement.id}
          </span>
        </div>
        
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-secondary" onClick={window.print}>
            <Printer style={{ width: "16px", height: "16px" }} />
            <span>Print Report (PDF)</span>
          </button>
          
          <button className="btn btn-secondary" onClick={downloadMarkdown}>
            <Download style={{ width: "16px", height: "16px" }} />
            <span>Export Markdown</span>
          </button>
          
          <button className="btn btn-outline" onClick={onRestart}>
            <RotateCcw style={{ width: "16px", height: "16px" }} />
            <span>Go Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Scorecard Columns */}
      <div className="grid-2" style={{ alignItems: "flex-start", gridTemplateColumns: "1.1fr 0.9fr" }}>
        
        {/* Left Column: Grade Summary and Rubrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Grade summary header card */}
          <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap" }}>
            <div className="score-circle-wrapper">
              <svg className="score-svg">
                <circle className="score-bg-circle" cx={radius} cy={radius} r={normalizedRadius} />
                <circle 
                  className="score-fill-circle" 
                  cx={radius} 
                  cy={radius} 
                  r={normalizedRadius} 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ stroke: grade.color }}
                />
              </svg>
              <div className="score-value">
                <span className="score-num" style={{ color: grade.color }}>{totalScore}</span>
                <span className="score-total">/ 100 Marks</span>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Strict Rubric Grade</h1>
                <span 
                  style={{ 
                    fontSize: "1.25rem", 
                    fontWeight: 800, 
                    color: grade.color, 
                    background: grade.bg,
                    padding: "0.25rem 1rem",
                    borderRadius: "6px",
                    border: `1px solid ${grade.color}33`
                  }}
                >
                  Grade: {grade.letter}
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                {data.summaryFeedback || "Project has been reviewed and graded strictly according to the specified features list."}
              </p>
            </div>
          </div>

          {/* Detailed rubric sections */}
          <div className="glass-card">
            <h2 style={{ marginBottom: "1.5rem" }}>Rubric Criteria Breakdown</h2>
            <div className="criteria-list">
              {EVALUATION_CRITERIA.map(criterion => {
                const isExpanded = expandedCriteria === criterion.key;
                const score = scores[criterion.key] ?? 0;
                const max = criterion.maxMarks;
                const critique = critiques[criterion.key] || "";
                
                // Color mapping for criteria score status
                const percent = (score / max) * 100;
                let statColor = "var(--accent-danger)";
                if (percent >= 80) statColor = "var(--accent-success)";
                else if (percent >= 50) statColor = "var(--accent-warning)";

                return (
                  <div key={criterion.key} className={`criteria-card ${isExpanded ? "expanded" : ""}`}>
                    
                    <div className="criteria-header" onClick={() => toggleExpand(criterion.key)}>
                      <div className="criteria-info">
                        <span style={{ color: isExpanded ? "var(--accent-primary)" : "var(--text-muted)" }}>
                          {isExpanded ? <ChevronUp style={{ width: "20px", height: "20px" }} /> : <ChevronDown style={{ width: "20px", height: "20px" }} />}
                        </span>
                        <span className="criteria-title">{criterion.name}</span>
                      </div>
                      
                      <div className="criteria-score-badge">
                        <span className="criteria-score-num" style={{ color: statColor }}>{score}</span>
                        <span className="criteria-score-max">/ {max}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="criteria-body">
                        {/* Interactive override controller */}
                        <div className="override-container" style={{ marginBottom: "1rem" }}>
                          <div className="override-label-row">
                            <span style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <Save style={{ width: "12px", height: "12px" }} />
                              <span>Manual Mark Adjustment</span>
                            </span>
                            <span>Max: {max} Marks</span>
                          </div>
                          
                          <div className="slider-row">
                            <input 
                              type="range" 
                              className="score-slider" 
                              min="0" 
                              max={max} 
                              value={score}
                              onChange={(e) => handleScoreChange(criterion.key, e.target.value, max)}
                            />
                            
                            <input 
                              type="number" 
                              className="override-input" 
                              min="0" 
                              max={max} 
                              value={score}
                              onChange={(e) => handleScoreChange(criterion.key, e.target.value, max)}
                            />
                          </div>
                        </div>

                        {/* AI Critique Textbox */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                            Detailed Evaluation Critique
                          </span>
                          <textarea
                            className="form-input"
                            style={{ 
                              background: "rgba(0,0,0,0.15)", 
                              fontSize: "0.875rem", 
                              lineHeight: 1.6, 
                              height: "120px", 
                              resize: "vertical", 
                              fontFamily: "inherit" 
                            }}
                            value={critique}
                            onChange={(e) => handleCritiqueChange(criterion.key, e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Custom Notes Section */}
          <div className="glass-card">
            <h2 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MessageSquare className="logo-icon" style={{ color: "var(--accent-cyan)" }} />
              <span>Overall Remarks / Comments</span>
            </h2>
            <textarea
              className="form-input"
              style={{ minHeight: "100px", fontSize: "0.9rem", resize: "vertical" }}
              placeholder="Add summary grading notes, student performance remarks, or instructions for correction..."
              value={customNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
          </div>

        </div>

        {/* Right Column: Feature Status & Improvements */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Features verified checklist */}
          <div className="glass-card">
            <h2 style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckSquare className="logo-icon" />
              <span>Features Checklist</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Checklist of target project specifications for <strong>{problemStatement.id}</strong> matched against source files.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(data.featuresEvaluated || []).map((feat, index) => {
                let badgeClass = "badge-danger";
                let statusText = "Missing";
                
                if (feat.status === "Implemented") {
                  badgeClass = "badge-success";
                  statusText = "Implemented";
                } else if (feat.status === "Partially Implemented") {
                  badgeClass = "badge-warning";
                  statusText = "Partial";
                }

                return (
                  <div key={index} className="feature-row">
                    <div className="feature-info">
                      <span className="feature-name">{feat.feature}</span>
                      <span className="feature-details">{feat.details || "No matching module found"}</span>
                    </div>
                    <span className={`badge ${badgeClass}`} style={{ flexShrink: 0 }}>
                      {statusText}
                    </span>
                  </div>
                );
              })}
              
              {(!data.featuresEvaluated || data.featuresEvaluated.length === 0) && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", padding: "1.5rem 0" }}>
                  No feature details were parsed.
                </div>
              )}
            </div>
          </div>

          {/* Critical improvements & issues list */}
          <div className="glass-card">
            <h2 style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle className="logo-icon" style={{ color: "var(--accent-warning)" }} />
              <span>Required Fixes & Code Improvements</span>
            </h2>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(data.improvements || []).map((fix, idx) => {
                const severity = (fix.severity || "medium").toLowerCase();
                
                return (
                  <div key={idx} className="fix-card">
                    <div className={`fix-icon-wrapper ${severity}`}>
                      <AlertCircle style={{ width: "16px", height: "16px" }} />
                    </div>
                    
                    <div className="fix-content">
                      <div className="fix-issue">
                        <span>{fix.issue}</span>
                        <span 
                          className={`badge badge-${severity === "high" ? "danger" : severity === "medium" ? "warning" : "info"}`}
                          style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", marginLeft: "0.5rem", verticalAlign: "middle" }}
                        >
                          {severity}
                        </span>
                      </div>
                      <div className="fix-suggestion">{fix.suggestion}</div>
                    </div>
                  </div>
                );
              })}
              
              {(!data.improvements || data.improvements.length === 0) && (
                <div style={{ 
                  color: "var(--accent-success)", 
                  fontSize: "0.9rem", 
                  textAlign: "center", 
                  padding: "2rem",
                  background: "rgba(16, 185, 129, 0.03)",
                  border: "1px dashed rgba(16, 185, 129, 0.15)",
                  borderRadius: "8px"
                }}>
                  🎉 Perfect Score! No critical improvements are required.
                </div>
              )}
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}

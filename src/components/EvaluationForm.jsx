import React, { useState, useEffect } from "react";
import { PROBLEM_STATEMENTS } from "../constants/problemStatements";
import { Play, Plus, Trash2, ShieldAlert, Cpu, Eye, ExternalLink, Columns } from "lucide-react";
import Github from "./GithubIcon";

export default function EvaluationForm({ 
  models, 
  hasCredentials, 
  onStartEvaluation,
  repos,
  onAddRepo,
  onAddBulkRepos,
  onRemoveRepo,
  onViewScorecard,
  onOpenCompare
}) {
  const [activeImportTab, setActiveImportTab] = useState("single");
  
  // Single import state
  const [studentName, setStudentName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedPs, setSelectedPs] = useState("PS-1");
  const [addError, setAddError] = useState("");

  // Bulk import state
  const [bulkText, setBulkText] = useState("");
  const [bulkPs, setBulkPs] = useState("PS-1");
  const [bulkError, setBulkError] = useState("");

  const [selectedModel, setSelectedModel] = useState("");

  // Set default model once models are fetched
  useEffect(() => {
    if (models && models.length > 0 && !selectedModel) {
      const defaultModel = 
        models.find(m => m.id.includes("gemini-2.5-flash"))?.id ||
        models.find(m => m.id.includes("gemini-2.0-flash"))?.id ||
        models.find(m => m.id.includes("gemini-1.5-flash"))?.id ||
        models[0].id;
      setSelectedModel(defaultModel);
    }
  }, [models, selectedModel]);

  const handleAddRepo = (e) => {
    e.preventDefault();
    setAddError("");

    if (!repoUrl.trim()) return;

    const url = repoUrl.trim();
    if (!url.toLowerCase().includes("github.com") && !url.includes("/")) {
      setAddError("Invalid URL. Please enter a valid GitHub Repository link.");
      return;
    }

    const name = studentName.trim() || `Student ${repos.length + 1}`;
    
    onAddRepo({
      studentName: name,
      url: url,
      problemStatementId: selectedPs
    });

    setStudentName("");
    setRepoUrl("");
    setSelectedPs("PS-1");
  };

  const handleAddBulkRepos = (e) => {
    e.preventDefault();
    setBulkError("");

    if (!bulkText.trim()) return;

    const lines = bulkText.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      setBulkError("No repository links detected.");
      return;
    }

    if (lines.length > 20) {
      setBulkError("Limit exceeded: You can add a maximum of 20 repository links at a time.");
      return;
    }

    const validRepos = [];
    const invalidLines = [];

    lines.forEach((line) => {
      if (line.toLowerCase().includes("github.com") || line.includes("/")) {
        let guessedName = "";
        try {
          const cleanLine = line.replace(/\/$/, "").replace(/\.git$/, "");
          const parts = cleanLine.split("/");
          const repoName = parts.pop();
          const owner = parts.pop();
          guessedName = `${owner} - ${repoName}`;
        } catch (e) {
          guessedName = `Student ${repos.length + validRepos.length + 1}`;
        }

        validRepos.push({
          studentName: guessedName,
          url: line,
          problemStatementId: bulkPs
        });
      } else {
        invalidLines.push(line);
      }
    });

    if (validRepos.length === 0) {
      setBulkError("None of the entered lines matched valid repository formats.");
      return;
    }

    onAddBulkRepos(validRepos);
    setBulkText("");

    if (invalidLines.length > 0) {
      setBulkError(`Successfully added ${validRepos.length} repos. Skipped ${invalidLines.length} invalid lines.`);
    }
  };

  // Triggers evaluation for all repos in the list and redirects to comparison view
  const handleEvaluateAndCompareAll = () => {
    if (repos.length === 0 || !selectedModel) return;
    onStartEvaluation({
      targetRepos: repos,
      modelId: selectedModel,
      redirectToCompare: true
    });
  };

  const gradedReposCount = repos.filter(r => r.status === "graded").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Settings warning if keys not configured */}
      {!hasCredentials && (
        <div style={{ 
          background: "rgba(239, 68, 68, 0.1)", 
          border: "1px solid rgba(239, 68, 68, 0.2)",
          padding: "1rem", 
          borderRadius: "8px", 
          color: "var(--accent-danger)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "100%",
          fontSize: "0.9rem"
        }}>
          <ShieldAlert style={{ flexShrink: 0 }} />
          <div>
            <strong>Missing credentials:</strong> Please configure your Gemini API Key and GitHub Token in the <strong>Settings</strong> tab before starting.
          </div>
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: "0.8fr 1.2fr", alignItems: "flex-start", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        
        {/* Left Panel: Import Panel (Tabs for Single vs Bulk) */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          
          <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", padding: "0.25rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <button
              className="btn"
              style={{ 
                flex: 1, 
                padding: "0.5rem", 
                borderRadius: "6px",
                fontSize: "0.8rem",
                background: activeImportTab === "single" ? "var(--accent-primary)" : "transparent",
                color: "white",
                boxShadow: "none"
              }}
              onClick={() => setActiveImportTab("single")}
            >
              Single Repo
            </button>
            <button
              className="btn"
              style={{ 
                flex: 1, 
                padding: "0.5rem", 
                borderRadius: "6px",
                fontSize: "0.8rem",
                background: activeImportTab === "bulk" ? "var(--accent-primary)" : "transparent",
                color: "white",
                boxShadow: "none"
              }}
              onClick={() => setActiveImportTab("bulk")}
            >
              Bulk Import (Max 20)
            </button>
          </div>

          {activeImportTab === "single" ? (
            <form onSubmit={handleAddRepo}>
              <h3 style={{ marginBottom: "1rem", fontSize: "0.95rem", color: "var(--accent-cyan)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Add Single Student Repository
              </h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="student-name">Student Name / Label</label>
                <input
                  id="student-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  disabled={!hasCredentials}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="repo-url">GitHub Repository Link</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="repo-url"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: "2.5rem" }}
                    placeholder="https://github.com/user/project"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                    disabled={!hasCredentials}
                  />
                  <Github 
                    style={{ 
                      position: "absolute", 
                      left: "1rem", 
                      top: "50%", 
                      transform: "translateY(-50%)", 
                      width: "16px", 
                      height: "16px",
                      color: "var(--text-muted)" 
                    }} 
                  />
                </div>
                {addError && (
                  <p style={{ color: "var(--accent-danger)", fontSize: "0.75rem", marginTop: "0.35rem" }}>{addError}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ps-select">Problem Statement</label>
                <select
                  id="ps-select"
                  className="form-select"
                  value={selectedPs}
                  onChange={(e) => setSelectedPs(e.target.value)}
                  disabled={!hasCredentials}
                >
                  {PROBLEM_STATEMENTS.map(ps => (
                    <option key={ps.id} value={ps.id}>
                      {ps.id}: {ps.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-secondary"
                style={{ width: "100%", marginTop: "1rem" }}
                disabled={!hasCredentials || !repoUrl}
              >
                <Plus style={{ width: "14px", height: "14px" }} />
                <span>Add to List</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddBulkRepos}>
              <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem", color: "var(--accent-cyan)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Bulk Paste Repositories
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Paste up to 20 GitHub links (one link per line). Names will be auto-extracted.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="bulk-repos">Repository URLs (One per line)</label>
                <textarea
                  id="bulk-repos"
                  className="form-input"
                  style={{ height: "150px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", resize: "none" }}
                  placeholder="https://github.com/student1/symposium&#10;https://github.com/student2/symposium&#10;https://github.com/student3/symposium"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  disabled={!hasCredentials}
                  required
                />
                {bulkError && (
                  <p style={{ 
                    color: bulkError.includes("Skipped") || bulkError.includes("Successfully") ? "var(--accent-warning)" : "var(--accent-danger)", 
                    fontSize: "0.75rem", 
                    marginTop: "0.35rem" 
                  }}>
                    {bulkError}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="bulk-ps-select">Target Problem Statement (For all links)</label>
                <select
                  id="bulk-ps-select"
                  className="form-select"
                  value={bulkPs}
                  onChange={(e) => setBulkPs(e.target.value)}
                  disabled={!hasCredentials}
                >
                  {PROBLEM_STATEMENTS.map(ps => (
                    <option key={ps.id} value={ps.id}>
                      {ps.id}: {ps.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-secondary"
                style={{ width: "100%", marginTop: "1rem" }}
                disabled={!hasCredentials || !bulkText.trim()}
              >
                <Plus style={{ width: "14px", height: "14px" }} />
                <span>Bulk Import Repositories</span>
              </button>
            </form>
          )}

        </div>

        {/* Right Panel: Classroom Repositories Table & Single Evaluate/Compare action */}
        <div className="glass-card" style={{ paddingBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Github className="logo-icon" />
              <span>Classroom Repositories ({repos.length})</span>
            </h2>
            
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {/* Compare Tab Shortcut */}
              {gradedReposCount > 0 && (
                <button
                  className="btn btn-outline"
                  style={{ padding: "0.45rem 1rem", fontSize: "0.8rem", borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)" }}
                  onClick={onOpenCompare}
                >
                  <Columns style={{ width: "14px", height: "14px" }} />
                  <span>Compare Graded ({gradedReposCount})</span>
                </button>
              )}

              {/* Global Model selection */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: "200px" }}>
                <Cpu style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
                <select
                  id="global-model-select"
                  className="form-select"
                  style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={!hasCredentials || models.length === 0}
                >
                  {models.length === 0 ? (
                    <option>Model loading...</option>
                  ) : (
                    models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.displayName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Unified Evaluation Control Panel */}
          {repos.length > 0 && (
            <div style={{ 
              background: "rgba(99, 102, 241, 0.08)", 
              border: "1px solid rgba(99, 102, 241, 0.2)", 
              padding: "1rem 1.5rem", 
              borderRadius: "10px", 
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div>
                <span style={{ fontSize: "0.95rem", fontWeight: 700, display: "block" }}>
                  Unified Batch Grading
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Trigger evaluations for all {repos.length} student repositories and compare them instantly.
                </span>
              </div>
              
              <button
                className="btn btn-primary"
                style={{ padding: "0.65rem 1.25rem", fontSize: "0.875rem", background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)" }}
                onClick={handleEvaluateAndCompareAll}
                disabled={!hasCredentials || !selectedModel}
              >
                <Play style={{ width: "14px", height: "14px" }} />
                <span>Evaluate & Compare All Repos</span>
              </button>
            </div>
          )}

          {/* Repos list table */}
          {repos.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "4rem 2rem", 
              color: "var(--text-secondary)",
              border: "1px dashed var(--border-color)",
              borderRadius: "8px",
              background: "rgba(0,0,0,0.1)"
            }}>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No Repositories Added</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Add repository links on the left panel to build your grading list.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Student Name</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Repository Link</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Problem</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Marks</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((repo) => {
                    const ps = PROBLEM_STATEMENTS.find(p => p.id === repo.problemStatementId);
                    const isGraded = repo.status === "graded" && repo.score !== undefined;
                    
                    return (
                      <tr 
                        key={repo.id} 
                        style={{ 
                          borderBottom: "1px solid rgba(255,255,255,0.03)", 
                          fontSize: "0.9rem",
                          background: isGraded ? "rgba(16, 185, 129, 0.01)" : "transparent"
                        }}
                      >
                        <td style={{ padding: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {repo.studentName}
                        </td>
                        
                        <td style={{ padding: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span 
                              style={{ 
                                color: "var(--text-secondary)", 
                                maxWidth: "250px", 
                                overflow: "hidden", 
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                              title={repo.url}
                            >
                              {repo.url.replace("https://github.com/", "")}
                            </span>
                            <a 
                              href={repo.url.startsWith("http") ? repo.url : `https://github.com/${repo.url}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: "var(--accent-primary)", display: "inline-flex" }}
                            >
                              <ExternalLink style={{ width: "12px", height: "12px" }} />
                            </a>
                          </div>
                        </td>
                        
                        <td style={{ padding: "1rem" }}>
                          <span 
                            className="badge badge-info" 
                            style={{ textTransform: "none", fontSize: "0.7rem" }}
                            title={ps?.title}
                          >
                            {repo.problemStatementId}
                          </span>
                        </td>
                        
                        <td style={{ padding: "1rem" }}>
                          {isGraded ? (
                            <span 
                              style={{ 
                                fontWeight: 700, 
                                color: repo.score >= 70 ? "var(--accent-success)" : repo.score >= 50 ? "var(--accent-warning)" : "var(--accent-danger)",
                                background: "rgba(255,255,255,0.03)",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px"
                              }}
                            >
                              {repo.score} / 100
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                              Unevaluated
                            </span>
                          )}
                        </td>
                        
                        <td style={{ padding: "1rem", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            {isGraded ? (
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                                onClick={() => onViewScorecard(repo)}
                              >
                                <Eye style={{ width: "12px", height: "12px" }} />
                                <span>Report</span>
                              </button>
                            ) : null}
                            
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: "0.35rem", borderRadius: "6px", color: "var(--accent-danger)" }}
                              onClick={() => onRemoveRepo(repo.id)}
                            >
                              <Trash2 style={{ width: "14px", height: "14px" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

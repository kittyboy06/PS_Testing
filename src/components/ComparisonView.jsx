import React, { useState } from "react";
import { PROBLEM_STATEMENTS } from "../constants/problemStatements";
import { BarChart3, Users, Award, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, RefreshCcw } from "lucide-react";

export default function ComparisonView({ repos, onRestart }) {
  const gradedRepos = repos.filter(r => r.status === "graded" && r.scorecardData);
  
  // Track selected repos to compare (defaults to all graded, capped at 6 for readability, or let the user select)
  const [selectedIds, setSelectedIds] = useState(
    gradedRepos.slice(0, 5).map(r => r.id)
  );

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter(x => x !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const reposToCompare = gradedRepos.filter(r => selectedIds.includes(r.id));

  // Compute Quick Class Stats
  const totalGraded = gradedRepos.length;
  const avgScore = totalGraded > 0 
    ? Math.round(gradedRepos.reduce((acc, curr) => acc + curr.score, 0) / totalGraded)
    : 0;

  // Find top performer
  let topPerformer = null;
  if (totalGraded > 0) {
    topPerformer = gradedRepos.reduce((prev, current) => (prev.score > current.score) ? prev : current);
  }

  // Helper to extract keywords like "Supabase", "localStorage", "MongoDB", "SQLite" from critique
  const detectDatabaseType = (dbCritique) => {
    if (!dbCritique) return "Unknown";
    const text = dbCritique.toLowerCase();
    if (text.includes("supabase")) return "Supabase";
    if (text.includes("firebase")) return "Firebase";
    if (text.includes("sqlite")) return "SQLite";
    if (text.includes("postgresql") || text.includes("postgres")) return "PostgreSQL";
    if (text.includes("mongodb")) return "MongoDB";
    if (text.includes("mysql")) return "MySQL";
    if (text.includes("localstorage")) return "localStorage";
    if (text.includes("mock") || text.includes("in-memory")) return "Mock DB";
    return "Custom DB Integration";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Title Header */}
      <div className="glass-card" style={{ padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
            Classroom Overview
          </span>
          <span style={{ fontSize: "1.25rem", fontWeight: 800, background: "linear-gradient(to right, #fff, var(--accent-cyan))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Comparative Analysis & Insights
          </span>
        </div>
        
        <button className="btn btn-secondary" onClick={onRestart}>
          <RefreshCcw style={{ width: "14px", height: "14px" }} />
          <span>Go to Dashboard</span>
        </button>
      </div>

      {totalGraded === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-secondary)" }}>
          <ShieldAlert style={{ width: "40px", height: "40px", color: "var(--accent-warning)", margin: "0 auto 1rem auto" }} />
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No Graded Repositories Yet</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Evaluate at least one student repository from the dashboard to enable comparison view.
          </p>
        </div>
      ) : (
        <>
          {/* Section 1: Quick Insights widgets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            
            <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem" }}>
              <div style={{ background: "rgba(99, 102, 241, 0.1)", color: "var(--accent-primary)", padding: "1rem", borderRadius: "12px" }}>
                <Users style={{ width: "24px", height: "24px" }} />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Class Size (Graded)
                </span>
                <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>{totalGraded} students</span>
              </div>
            </div>

            <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem" }}>
              <div style={{ background: "rgba(6, 182, 212, 0.1)", color: "var(--accent-cyan)", padding: "1rem", borderRadius: "12px" }}>
                <BarChart3 style={{ width: "24px", height: "24px" }} />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                  Class Average Score
                </span>
                <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent-cyan)" }}>
                  {avgScore} / 100
                </span>
              </div>
            </div>

            {topPerformer && (
              <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem" }}>
                <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-success)", padding: "1rem", borderRadius: "12px" }}>
                  <Award style={{ width: "24px", height: "24px" }} />
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                    Top Performer
                  </span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--accent-success)" }}>
                    {topPerformer.studentName} ({topPerformer.score}/100)
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }}>
                    {topPerformer.url.replace("https://github.com/", "")}
                  </span>
                </div>
              </div>
            )}
            
          </div>

          {/* Section 2: Repository Selection Checks */}
          <div className="glass-card">
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>Select Repositories to Compare</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {gradedRepos.map(repo => {
                const isSelected = selectedIds.includes(repo.id);
                return (
                  <button
                    key={repo.id}
                    className={`btn ${isSelected ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", borderRadius: "20px" }}
                    onClick={() => toggleSelect(repo.id)}
                  >
                    <span style={{ marginRight: "0.25rem" }}>{isSelected ? "✓" : "+"}</span>
                    <span>{repo.studentName}</span>
                    <span style={{ marginLeft: "0.5rem", opacity: 0.7 }}>({repo.score}/100)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Comparative Grid Table */}
          {reposToCompare.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              Please select at least one student repository to show comparison details.
            </div>
          ) : (
            <div className="glass-card" style={{ overflowX: "auto", padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                    <th style={{ padding: "1.25rem 1.5rem", width: "200px", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                      Metric
                    </th>
                    {reposToCompare.map(repo => (
                      <th key={repo.id} style={{ padding: "1.25rem 1.5rem", minWidth: "220px", borderLeft: "1px solid var(--border-color)" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {repo.studentName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span>{repo.url.replace("https://github.com/", "")}</span>
                          <a href={repo.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-primary)" }}>
                            <ExternalLink style={{ width: "10px", height: "10px" }} />
                          </a>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  
                  {/* Row: Problem Statement */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Problem Statement
                    </td>
                    {reposToCompare.map(repo => (
                      <td key={repo.id} style={{ padding: "1rem 1.5rem", borderLeft: "1px solid var(--border-color)", fontSize: "0.875rem" }}>
                        <span className="badge badge-info" style={{ fontSize: "0.7rem", textTransform: "none" }}>
                          {repo.problemStatementId}
                        </span>
                        <span style={{ marginLeft: "0.5rem", color: "var(--text-secondary)" }}>
                          {PROBLEM_STATEMENTS.find(p => p.id === repo.problemStatementId)?.title}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Row: Score Grade */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(255,255,255,0.005)" }}>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Overall Score / Grade
                    </td>
                    {reposToCompare.map(repo => {
                      const total = repo.score;
                      let color = "var(--accent-danger)";
                      if (total >= 80) color = "var(--accent-success)";
                      else if (total >= 50) color = "var(--accent-warning)";

                      return (
                        <td key={repo.id} style={{ padding: "1.25rem 1.5rem", borderLeft: "1px solid var(--border-color)" }}>
                          <span style={{ fontSize: "1.5rem", fontWeight: 800, color }}>{total}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: "0.25rem" }}>/ 100</span>
                          <span style={{ marginLeft: "0.75rem", fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.03)" }}>
                            Grade: {repo.scorecardData ? Math.round(total) >= 90 ? "A+" : Math.round(total) >= 80 ? "A" : Math.round(total) >= 70 ? "B" : Math.round(total) >= 50 ? "C" : "F" : "-"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Database choice */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "1rem 1.5rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Database Choice
                    </td>
                    {reposToCompare.map(repo => {
                      const db = detectDatabaseType(repo.scorecardData?.criteriaBreakdown?.databaseIntegration?.critique);
                      return (
                        <td key={repo.id} style={{ padding: "1rem 1.5rem", borderLeft: "1px solid var(--border-color)", fontSize: "0.9rem", fontWeight: 600, color: "var(--accent-cyan)" }}>
                          {db}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Constraint Compliance */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(255,255,255,0.005)" }}>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Constraints Adherence
                    </td>
                    {reposToCompare.map(repo => {
                      const details = repo.scorecardData?.criteriaBreakdown?.functionalCompleteness?.critique || "No details";
                      return (
                        <td key={repo.id} style={{ padding: "1.25rem 1.5rem", borderLeft: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, verticalAlign: "top" }}>
                          <div style={{ maxHeight: "120px", overflowY: "auto", paddingRight: "0.25rem" }}>
                            {details}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Extras / Creativity */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Extras & Innovations
                    </td>
                    {reposToCompare.map(repo => {
                      const details = repo.scorecardData?.criteriaBreakdown?.creativityInnovation?.critique || "No details";
                      const score = repo.scorecardData?.criteriaBreakdown?.creativityInnovation?.score || 0;
                      return (
                        <td key={repo.id} style={{ padding: "1.25rem 1.5rem", borderLeft: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, verticalAlign: "top" }}>
                          <div style={{ fontWeight: 600, color: "var(--accent-success)", marginBottom: "0.25rem" }}>
                            Marks: {score} / 10
                          </div>
                          <div style={{ maxHeight: "120px", overflowY: "auto", paddingRight: "0.25rem" }}>
                            {details}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: UI/UX Quality */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: "rgba(255,255,255,0.005)" }}>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      UI/UX Design
                    </td>
                    {reposToCompare.map(repo => {
                      const details = repo.scorecardData?.criteriaBreakdown?.uiUxDesign?.critique || "No details";
                      return (
                        <td key={repo.id} style={{ padding: "1.25rem 1.5rem", borderLeft: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, verticalAlign: "top" }}>
                          <div style={{ maxHeight: "120px", overflowY: "auto", paddingRight: "0.25rem" }}>
                            {details}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Row: Validation & Error Handling */}
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Validations & Errors
                    </td>
                    {reposToCompare.map(repo => {
                      const details = repo.scorecardData?.criteriaBreakdown?.validationErrorHandling?.critique || "No details";
                      return (
                        <td key={repo.id} style={{ padding: "1.25rem 1.5rem", borderLeft: "1px solid var(--border-color)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, verticalAlign: "top" }}>
                          <div style={{ maxHeight: "120px", overflowY: "auto", paddingRight: "0.25rem" }}>
                            {details}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

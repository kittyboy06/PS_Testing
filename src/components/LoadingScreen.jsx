import React from "react";
import { Loader2, Check, AlertCircle, Play, Hourglass, ShieldAlert } from "lucide-react";

export default function LoadingScreen({ batch, progressMap, error, onCancel, onProceedToCompare }) {
  // Helper to determine status and colors for each repo row
  const getStatusDisplay = (repoId) => {
    const progress = progressMap[repoId];
    if (!progress) return { label: "Queued", color: "var(--text-muted)", icon: <Hourglass style={{ width: "16px", height: "16px" }} /> };
    
    switch (progress.status) {
      case "queued":
        return { 
          label: "Queued", 
          color: "var(--text-muted)", 
          icon: <Hourglass style={{ width: "16px", height: "16px" }} /> 
        };
      case "parsing":
      case "metadata":
      case "tree":
        return { 
          label: "Connecting...", 
          color: "var(--accent-cyan)", 
          icon: <Loader2 className="spinner" style={{ width: "14px", height: "14px", margin: 0, borderTopColor: "white", borderWidth: "2px" }} /> 
        };
      case "downloading":
        const current = progress.current || 0;
        const total = progress.total || 0;
        return { 
          label: `Downloading (${current}/${total})`, 
          color: "var(--accent-primary)", 
          icon: <Loader2 className="spinner" style={{ width: "14px", height: "14px", margin: 0, borderTopColor: "white", borderWidth: "2px" }} /> 
        };
      case "evaluating":
        return { 
          label: "AI Grading...", 
          color: "var(--accent-secondary)", 
          icon: <Loader2 className="spinner" style={{ width: "14px", height: "14px", margin: 0, borderTopColor: "white", borderWidth: "2px" }} /> 
        };
      case "complete":
        return { 
          label: "Completed", 
          color: "var(--accent-success)", 
          icon: <Check style={{ width: "16px", height: "16px", color: "var(--accent-success)" }} /> 
        };
      case "error":
        return { 
          label: "Failed", 
          color: "var(--accent-danger)", 
          icon: <AlertCircle style={{ width: "16px", height: "16px", color: "var(--accent-danger)" }} /> 
        };
      default:
        return { 
          label: "Pending", 
          color: "var(--text-secondary)", 
          icon: <Hourglass style={{ width: "16px", height: "16px" }} /> 
        };
    }
  };

  const totalRepos = batch.length;
  const completedRepos = Object.values(progressMap).filter(p => p.status === "complete").length;
  const failedRepos = Object.values(progressMap).filter(p => p.status === "error").length;
  const isFinished = totalRepos > 0 && (completedRepos + failedRepos === totalRepos);
  const processingPercent = totalRepos > 0 ? Math.round(((completedRepos + failedRepos) / totalRepos) * 100) : 0;

  return (
    <div className="glass-card" style={{ maxWidth: "800px", margin: "2rem auto" }}>
      <h2 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Play className="logo-icon" />
        <span>Parallel Classroom Evaluation</span>
      </h2>
      
      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Running evaluations in parallel (concurrency queue limit of 3 to prevent API rate limits). Code quality and specifications are being graded strictly.
      </p>

      {/* Main progress bar */}
      <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", height: "10px", borderRadius: "5px", overflow: "hidden", marginBottom: "2rem", position: "relative" }}>
        <div 
          style={{ 
            width: `${processingPercent}%`, 
            background: failedRepos > 0 && isFinished
              ? "linear-gradient(to right, var(--accent-warning), var(--accent-danger))"
              : "linear-gradient(to right, var(--accent-primary), var(--accent-cyan))",
            height: "100%",
            transition: "width 0.3s ease" 
          }} 
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        <span>Evaluated: <strong>{completedRepos}</strong> / {totalRepos}</span>
        {failedRepos > 0 && <span style={{ color: "var(--accent-danger)", fontWeight: 600 }}>Failed: {failedRepos}</span>}
        <span>Overall Progress: <strong>{processingPercent}%</strong></span>
      </div>

      {/* Finish warning if there are failures */}
      {isFinished && failedRepos > 0 && (
        <div style={{ 
          background: "rgba(245, 158, 11, 0.08)", 
          border: "1px solid rgba(245, 158, 11, 0.2)",
          padding: "1rem 1.25rem", 
          borderRadius: "8px", 
          color: "var(--accent-warning)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
          textAlign: "left"
        }}>
          <ShieldAlert style={{ flexShrink: 0, color: "var(--accent-warning)" }} />
          <div>
            <strong>Evaluation complete with failures:</strong> {failedRepos} of {totalRepos} student repositories failed to grade (see error details below). You can still proceed to compare the successful ones.
          </div>
        </div>
      )}

      {/* Repos progress list */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "0.75rem", 
        maxHeight: "350px", 
        overflowY: "auto", 
        paddingRight: "0.5rem",
        marginBottom: "2rem",
        background: "rgba(0,0,0,0.15)",
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid var(--border-color)"
      }}>
        {batch.map(repo => {
          const status = getStatusDisplay(repo.id);
          const progress = progressMap[repo.id];
          const hasError = progress?.status === "error";

          return (
            <div 
              key={repo.id} 
              style={{ 
                display: "flex", 
                flexDirection: "column",
                padding: "0.75rem 1rem", 
                background: "rgba(255,255,255,0.02)", 
                border: "1px solid var(--border-color)",
                borderRadius: "6px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{repo.studentName}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                    ({repo.url.replace("https://github.com/", "")})
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: status.color, fontWeight: 600 }}>
                  {status.icon}
                  <span>{status.label}</span>
                </div>
              </div>

              {/* Individual progress bar (for downloading) */}
              {progress?.status === "downloading" && progress.total > 0 && (
                <div style={{ width: "100%", background: "rgba(255,255,255,0.03)", height: "3px", borderRadius: "1.5px", marginTop: "0.5rem", overflow: "hidden" }}>
                  <div 
                    style={{ 
                      width: `${(progress.current / progress.total) * 100}%`, 
                      background: "var(--accent-primary)", 
                      height: "100%", 
                      transition: "width 0.1s ease" 
                    }} 
                  />
                </div>
              )}

              {/* Individual error message */}
              {hasError && progress.message && (
                <div style={{ color: "var(--accent-danger)", fontSize: "0.75rem", marginTop: "0.35rem", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                  Error: {progress.message}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        {isFinished && failedRepos > 0 ? (
          <>
            {completedRepos > 0 && (
              <button 
                className="btn btn-primary" 
                onClick={onProceedToCompare}
                style={{ flex: 1.5 }}
              >
                View Comparison ({completedRepos} Successful)
              </button>
            )}
            <button 
              className="btn btn-secondary" 
              onClick={onCancel}
              style={{ flex: 1 }}
            >
              Back to Dashboard
            </button>
          </>
        ) : (
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            style={{ flex: 1 }}
          >
            {isFinished ? "Return to Dashboard" : "Cancel Batch Evaluation"}
          </button>
        )}
      </div>

    </div>
  );
}

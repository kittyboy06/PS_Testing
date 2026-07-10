import React, { useState, useEffect } from "react";
import { Key, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import Github from "./GithubIcon";
import { fetchAvailableModels } from "../services/gemini";

export default function SettingsView({ onModelsLoaded, onCredentialsChanged }) {
  const [geminiKey, setGeminiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  
  const [isValidatingGemini, setIsValidatingGemini] = useState(false);
  const [isValidatingGithub, setIsValidatingGithub] = useState(false);
  
  const [geminiStatus, setGeminiStatus] = useState("idle"); // idle, success, error
  const [githubStatus, setGithubStatus] = useState("idle"); // idle, success, error
  
  const [geminiError, setGeminiError] = useState("");
  const [githubError, setGithubError] = useState("");
  
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);

  // Load from environment or localStorage
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem("evaluator_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
    const savedGithubToken = localStorage.getItem("evaluator_github_token") || import.meta.env.VITE_GITHUB_TOKEN || "";
    
    setGeminiKey(savedGeminiKey);
    setGithubToken(savedGithubToken);
    
    if (savedGeminiKey || savedGithubToken) {
      // Auto-validate if keys are present on load
      validateCredentials(savedGeminiKey, savedGithubToken);
    }
  }, []);

  const validateCredentials = async (gKey, ghToken) => {
    const targetGemini = gKey !== undefined ? gKey : geminiKey;
    const targetGithub = ghToken !== undefined ? ghToken : githubToken;
    
    onCredentialsChanged({
      geminiKey: targetGemini,
      githubToken: targetGithub
    });

    if (targetGemini) {
      setIsValidatingGemini(true);
      setGeminiError("");
      try {
        const models = await fetchAvailableModels(targetGemini);
        setAvailableModels(models);
        setGeminiStatus("success");
        onModelsLoaded(models);
        
        // Save to localStorage
        localStorage.setItem("evaluator_gemini_key", targetGemini);
      } catch (err) {
        setGeminiStatus("error");
        setGeminiError(err.message || "Failed to validate Gemini API key.");
        onModelsLoaded([]);
      } finally {
        setIsValidatingGemini(false);
      }
    } else {
      setGeminiStatus("idle");
      onModelsLoaded([]);
    }

    if (targetGithub) {
      setIsValidatingGithub(true);
      setGithubError("");
      try {
        const response = await fetch("https://api.github.com/rate_limit", {
          headers: {
            "Authorization": `token ${targetGithub}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setRateLimitInfo(data.resources.core);
          setGithubStatus("success");
          
          // Save to localStorage
          localStorage.setItem("evaluator_github_token", targetGithub);
        } else {
          throw new Error("GitHub token is invalid or rate limit check failed.");
        }
      } catch (err) {
        setGithubStatus("error");
        setGithubError(err.message || "Failed to validate GitHub token.");
        setRateLimitInfo(null);
      } finally {
        setIsValidatingGithub(false);
      }
    } else {
      setGithubStatus("idle");
      setRateLimitInfo(null);
    }
  };

  const handleSave = () => {
    validateCredentials(geminiKey, githubToken);
  };

  const handleClear = () => {
    localStorage.removeItem("evaluator_gemini_key");
    localStorage.removeItem("evaluator_github_token");
    setGeminiKey("");
    setGithubToken("");
    setGeminiStatus("idle");
    setGithubStatus("idle");
    setAvailableModels([]);
    setRateLimitInfo(null);
    onModelsLoaded([]);
    onCredentialsChanged({ geminiKey: "", githubToken: "" });
  };

  return (
    <div className="settings-grid">
      <div className="glass-card">
        <h2 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Key className="logo-icon" style={{ width: "24px", height: "24px" }} />
          <span>API Credentials</span>
        </h2>
        
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Configure API credentials to start project evaluations. Keys are stored locally in your browser's local storage and communicated securely to GitHub and Google API servers.
        </p>

        <div className="form-group">
          <label className="form-label" htmlFor="gemini-key">Gemini API Key</label>
          <div style={{ position: "relative" }}>
            <input
              id="gemini-key"
              type="password"
              className="form-input"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
          </div>
          {geminiError && (
            <p style={{ color: "var(--accent-danger)", fontSize: "0.8rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <AlertCircle style={{ width: "14px", height: "14px" }} />
              <span>{geminiError}</span>
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="github-token">GitHub Personal Access Token (PAT)</label>
          <input
            id="github-token"
            type="password"
            className="form-input"
            placeholder="github_pat_..."
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
          />
          {githubError && (
            <p style={{ color: "var(--accent-danger)", fontSize: "0.8rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <AlertCircle style={{ width: "14px", height: "14px" }} />
              <span>{githubError}</span>
            </p>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
            Required to fetch the repository structure recursively. Generate one from GitHub settings with 'repo' scope.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isValidatingGemini || isValidatingGithub}
            style={{ flex: 1 }}
          >
            {(isValidatingGemini || isValidatingGithub) ? (
              <>
                <RefreshCw className="spinner" style={{ width: "16px", height: "16px", margin: 0, borderWidth: "2px" }} />
                <span>Validating...</span>
              </>
            ) : (
              <span>Save & Validate Keys</span>
            )}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleClear}
            disabled={isValidatingGemini || isValidatingGithub}
          >
            Clear Keys
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h2 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 className="logo-icon" style={{ width: "24px", height: "24px", color: "var(--accent-cyan)" }} />
          <span>Status & Capabilities</span>
        </h2>

        <div className="status-indicator-box">
          <div className="indicator-row">
            <span style={{ fontWeight: 600 }}>Gemini API Integration</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {geminiStatus === "success" && <span style={{ color: "var(--accent-success)", fontSize: "0.875rem", fontWeight: 600 }}>Connected</span>}
              {geminiStatus === "error" && <span style={{ color: "var(--accent-danger)", fontSize: "0.875rem", fontWeight: 600 }}>Error</span>}
              {geminiStatus === "idle" && <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Disconnected</span>}
              <span className={`status-dot ${geminiStatus === "success" ? "active" : geminiStatus === "error" ? "error" : ""}`} />
            </div>
          </div>
          
          {geminiStatus === "success" && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                Available Models ({availableModels.length}):
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", maxHeight: "150px", overflowY: "auto", paddingRight: "0.5rem" }}>
                {availableModels.map(model => (
                  <span 
                    key={model.id} 
                    className="badge badge-info" 
                    style={{ textTransform: "none", fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}
                    title={`Input Token Limit: ${model.inputTokenLimit}`}
                  >
                    {model.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="status-indicator-box" style={{ marginTop: "1.5rem" }}>
          <div className="indicator-row">
            <span style={{ fontWeight: 600 }}>GitHub API Access</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {githubStatus === "success" && <span style={{ color: "var(--accent-success)", fontSize: "0.875rem", fontWeight: 600 }}>Connected</span>}
              {githubStatus === "error" && <span style={{ color: "var(--accent-danger)", fontSize: "0.875rem", fontWeight: 600 }}>Error</span>}
              {githubStatus === "idle" && <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Disconnected</span>}
              <span className={`status-dot ${githubStatus === "success" ? "active" : githubStatus === "error" ? "error" : ""}`} />
            </div>
          </div>

          {githubStatus === "success" && rateLimitInfo && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem", fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>API Rate Limit (Core):</span>
                <span style={{ fontWeight: 600 }}>{rateLimitInfo.remaining} / {rateLimitInfo.limit}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Reset Time:</span>
                <span style={{ fontWeight: 600 }}>{new Date(rateLimitInfo.reset * 1000).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Cpu, Settings, CheckCircle, Database } from "lucide-react";
import SettingsView from "./components/SettingsView";
import EvaluationForm from "./components/EvaluationForm";
import LoadingScreen from "./components/LoadingScreen";
import Scorecard from "./components/Scorecard";
import ComparisonView from "./components/ComparisonView";
import { PROBLEM_STATEMENTS, EVALUATION_CRITERIA } from "./constants/problemStatements";
import { scanRepository } from "./services/github";
import { runCodeEvaluation } from "./services/gemini";
import Github from "./components/GithubIcon";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, settings, loading, scorecard, compare
  
  // Credentials and models state
  const [credentials, setCredentials] = useState({ geminiKey: "", githubToken: "" });
  const [availableModels, setAvailableModels] = useState([]);
  
  // Active batch evaluation states
  const [batchRepos, setBatchRepos] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [evaluationError, setEvaluationError] = useState("");
  
  // Active singular report view states
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [selectedPs, setSelectedPs] = useState(null);
  const [repoInfo, setRepoInfo] = useState(null);

  // Classroom repos list state
  const [repos, setRepos] = useState([]);
  const [activeRepoId, setActiveRepoId] = useState(null);

  // Load credentials & repo list on startup
  useEffect(() => {
    const savedGeminiKey = localStorage.getItem("evaluator_gemini_key") || import.meta.env.VITE_GEMINI_API_KEY || "";
    const savedGithubToken = localStorage.getItem("evaluator_github_token") || import.meta.env.VITE_GITHUB_TOKEN || "";
    
    setCredentials({
      geminiKey: savedGeminiKey,
      githubToken: savedGithubToken
    });

    const savedRepos = localStorage.getItem("evaluator_repos_list");
    if (savedRepos) {
      try {
        setRepos(JSON.parse(savedRepos));
      } catch (e) {
        console.error("Failed to parse saved repos list:", e);
      }
    }

    if (!savedGeminiKey || !savedGithubToken) {
      setActiveTab("settings");
    }
  }, []);

  const handleCredentialsChanged = (newCreds) => {
    setCredentials(newCreds);
  };

  const handleModelsLoaded = (models) => {
    setAvailableModels(models);
  };

  // Manage Classroom Repos list
  const handleAddRepo = (newRepo) => {
    const updated = [
      ...repos,
      {
        id: crypto.randomUUID(),
        studentName: newRepo.studentName,
        url: newRepo.url,
        problemStatementId: newRepo.problemStatementId,
        status: "unevaluated"
      }
    ];
    setRepos(updated);
    localStorage.setItem("evaluator_repos_list", JSON.stringify(updated));
  };

  const handleAddBulkRepos = (validRepos) => {
    const newItems = validRepos.map(item => ({
      id: crypto.randomUUID(),
      studentName: item.studentName,
      url: item.url,
      problemStatementId: item.problemStatementId,
      status: "unevaluated"
    }));

    const updated = [...repos, ...newItems];
    setRepos(updated);
    localStorage.setItem("evaluator_repos_list", JSON.stringify(updated));
  };

  const handleRemoveRepo = (id) => {
    const updated = repos.filter(r => r.id !== id);
    setRepos(updated);
    localStorage.setItem("evaluator_repos_list", JSON.stringify(updated));
    
    if (activeRepoId === id) {
      setActiveRepoId(null);
      setEvaluationResult(null);
      if (activeTab === "scorecard") {
        setActiveTab("dashboard");
      }
    }
  };

  const handleViewScorecard = (repo) => {
    setActiveRepoId(repo.id);
    setSelectedPs(PROBLEM_STATEMENTS.find(p => p.id === repo.problemStatementId));
    setRepoInfo({
      owner: repo.owner,
      repo: repo.repo,
      branch: repo.branch
    });
    setEvaluationResult(repo.scorecardData);
    setActiveTab("scorecard");
  };

  // Callback from Scorecard when grades are updated in real-time
  const handleScorecardUpdate = ({ scores, critiques, customNotes }) => {
    if (!activeRepoId) return;

    const totalScore = Object.values(scores).reduce((acc, curr) => acc + (Number(curr) || 0), 0);

    const updated = repos.map(r => {
      if (r.id === activeRepoId) {
        const updatedBreakdown = { ...r.scorecardData.criteriaBreakdown };
        Object.keys(scores).forEach(key => {
          updatedBreakdown[key] = {
            score: scores[key],
            critique: critiques[key]
          };
        });

        const updatedScorecardData = {
          ...r.scorecardData,
          overallScore: totalScore,
          criteriaBreakdown: updatedBreakdown,
          summaryFeedback: r.scorecardData.summaryFeedback
        };

        return {
          ...r,
          score: totalScore,
          scorecardData: updatedScorecardData,
          customNotes: customNotes
        };
      }
      return r;
    });

    setRepos(updated);
    localStorage.setItem("evaluator_repos_list", JSON.stringify(updated));
    
    setEvaluationResult(prev => {
      if (!prev) return null;
      const updatedBreakdown = { ...prev.criteriaBreakdown };
      Object.keys(scores).forEach(key => {
        updatedBreakdown[key] = {
          score: scores[key],
          critique: critiques[key]
        };
      });
      return {
        ...prev,
        overallScore: totalScore,
        criteriaBreakdown: updatedBreakdown
      };
    });
  };

  // Simultaneous batch evaluation runner with controlled concurrency
  const startEvaluation = async ({ targetRepos, modelId, redirectToCompare = false }) => {
    setBatchRepos(targetRepos);
    setEvaluationError("");
    setActiveTab("loading");

    // Initialize progress map for all target repos as "queued"
    const initialProgressMap = {};
    targetRepos.forEach(repo => {
      initialProgressMap[repo.id] = { status: "queued", message: "Waiting in queue..." };
    });
    setProgressMap(initialProgressMap);

    const queue = [...targetRepos];
    const concurrencyLimit = 3;
    const finalGradingResults = {};

    const updateRepoProgress = (repoId, progressUpdate) => {
      setProgressMap(prev => ({
        ...prev,
        [repoId]: {
          ...prev[repoId],
          ...progressUpdate
        }
      }));
    };

    const worker = async (workerId) => {
      // Stagger worker start to prevent API rate limit bursts (stagger 2s per worker)
      if (workerId > 0) {
        await new Promise(resolve => setTimeout(resolve, workerId * 2000));
      }

      while (queue.length > 0) {
        const repo = queue.shift();
        if (!repo) break;

        updateRepoProgress(repo.id, { status: "parsing", message: "Parsing repository URL..." });

        try {
          const scanResult = await scanRepository(
            repo.url,
            credentials.githubToken,
            (progress) => {
              updateRepoProgress(repo.id, progress);
            }
          );

          const parsedRepoInfo = {
            owner: scanResult.owner,
            repo: scanResult.repo,
            branch: scanResult.branch
          };

          updateRepoProgress(repo.id, {
            status: "evaluating",
            message: "Running strict AI grading..."
          });

          const targetPs = PROBLEM_STATEMENTS.find(ps => ps.id === repo.problemStatementId);
          const gradingResult = await runCodeEvaluation(
            credentials.geminiKey,
            modelId,
            scanResult,
            targetPs,
            EVALUATION_CRITERIA
          );

          finalGradingResults[repo.id] = {
            status: "graded",
            score: gradingResult.overallScore,
            scorecardData: gradingResult,
            owner: parsedRepoInfo.owner,
            repo: parsedRepoInfo.repo,
            branch: parsedRepoInfo.branch,
            evaluatedAt: new Date().toISOString(),
            modelUsed: modelId
          };

          updateRepoProgress(repo.id, { status: "complete", message: "Completed successfully!" });

        } catch (err) {
          console.error(`Failed evaluating ${repo.studentName}:`, err);
          updateRepoProgress(repo.id, { 
            status: "error", 
            message: err.message || "Evaluation failed." 
          });
        }

        // Cool-down pause between items in the queue to prevent hit rate limits
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    };

    const workers = [];
    const numWorkers = Math.min(concurrencyLimit, targetRepos.length);
    for (let i = 0; i < numWorkers; i++) {
      workers.push(worker(i));
    }

    await Promise.all(workers);

    // Sync all final grading results to state and localStorage
    setRepos(currentRepos => {
      const updated = currentRepos.map(r => {
        if (finalGradingResults[r.id]) {
          return {
            ...r,
            ...finalGradingResults[r.id]
          };
        }
        return r;
      });
      localStorage.setItem("evaluator_repos_list", JSON.stringify(updated));
      return updated;
    });

    // Handle redirection based on unified flow parameters and failures
    const successCount = Object.keys(finalGradingResults).length;
    const hasFailures = successCount < targetRepos.length;

    if (redirectToCompare && !hasFailures) {
      setActiveTab("compare");
    } else if (targetRepos.length === 1 && successCount === 1) {
      const singleRepoId = targetRepos[0].id;
      const gradedInfo = finalGradingResults[singleRepoId];
      
      setActiveRepoId(singleRepoId);
      setSelectedPs(PROBLEM_STATEMENTS.find(p => p.id === targetRepos[0].problemStatementId));
      setRepoInfo({
        owner: gradedInfo.owner,
        repo: gradedInfo.repo,
        branch: gradedInfo.branch
      });
      setEvaluationResult(gradedInfo.scorecardData);
      setActiveTab("scorecard");
    } else if (!redirectToCompare) {
      // Multiple items evaluated but not directed to compare, return to dashboard
      setActiveTab("dashboard");
    }
  };

  const cancelEvaluation = () => {
    setActiveTab("dashboard");
    setEvaluationError("");
    setBatchRepos([]);
    setProgressMap({});
  };

  const hasCredentials = credentials.geminiKey && credentials.githubToken;

  return (
    <div className="app-container">
      {/* Top Header Navigation */}
      <header className="header">
        <div className="logo-container">
          <Database className="logo-icon" style={{ width: "22px", height: "22px" }} />
          <span className="logo-text">AI Evaluation Engine</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.25rem", background: "rgba(255,255,255,0.03)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
            strict-mode v1.4
          </span>
        </div>
        
        <nav className="nav-links">
          {activeTab !== "loading" && (
            <>
              <button 
                className={`btn ${activeTab === "dashboard" || activeTab === "scorecard" || activeTab === "compare" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("dashboard")}
                disabled={!hasCredentials}
                style={{ padding: "0.5rem 1rem" }}
              >
                Dashboard
              </button>
              
              <button 
                className={`btn ${activeTab === "settings" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveTab("settings")}
                style={{ padding: "0.5rem 1rem" }}
              >
                <Settings style={{ width: "16px", height: "16px" }} />
                <span>Settings</span>
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === "settings" && (
          <SettingsView 
            onModelsLoaded={handleModelsLoaded}
            onCredentialsChanged={handleCredentialsChanged}
          />
        )}
        
        {activeTab === "dashboard" && (
          <EvaluationForm 
            models={availableModels}
            hasCredentials={hasCredentials}
            onStartEvaluation={startEvaluation}
            repos={repos}
            onAddRepo={handleAddRepo}
            onAddBulkRepos={handleAddBulkRepos}
            onRemoveRepo={handleRemoveRepo}
            onViewScorecard={handleViewScorecard}
            onOpenCompare={() => setActiveTab("compare")}
          />
        )}
        
        {activeTab === "loading" && (
          <LoadingScreen 
            batch={batchRepos}
            progressMap={progressMap}
            error={evaluationError}
            onCancel={cancelEvaluation}
            onProceedToCompare={() => setActiveTab("compare")}
          />
        )}
        
        {activeTab === "scorecard" && evaluationResult && (
          <Scorecard 
            data={evaluationResult}
            problemStatement={selectedPs}
            repoInfo={repoInfo}
            onRestart={() => {
              setActiveTab("dashboard");
            }}
            onUpdateScorecard={handleScorecardUpdate}
            savedCustomNotes={repos.find(r => r.id === activeRepoId)?.customNotes || ""}
          />
        )}

        {activeTab === "compare" && (
          <ComparisonView 
            repos={repos}
            onRestart={() => setActiveTab("dashboard")}
          />
        )}
      </main>
    </div>
  );
}

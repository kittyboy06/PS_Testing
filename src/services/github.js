/**
 * Parse a GitHub URL to extract owner and repo name.
 * Supports:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(url) {
  if (!url) return null;
  
  let cleanUrl = url.trim().replace(/\/$/, ""); // Remove trailing slash
  cleanUrl = cleanUrl.replace(/\.git$/, ""); // Remove .git suffix
  
  // Pattern: matches github.com/owner/repo or github.com:owner/repo
  const githubPattern = /^(?:https?:\/\/)?(?:www\.)?github\.com[\/|:]([^\/]+)\/([^\/]+)$/i;
  const match = cleanUrl.match(githubPattern);
  
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  
  // Pattern: matches simple owner/repo
  const simplePattern = /^([^\/]+)\/([^\/]+)$/;
  const simpleMatch = cleanUrl.match(simplePattern);
  if (simpleMatch) {
    return { owner: simpleMatch[1], repo: simpleMatch[2] };
  }
  
  return null;
}

/**
 * Fetch the repository metadata to get details like the default branch.
 */
export async function fetchRepoInfo(owner, repo, token) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("GitHub token is invalid or unauthorized.");
    } else if (response.status === 404) {
      throw new Error("Repository not found. Please check the URL and your token permissions.");
    } else {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
  }
  
  return await response.json();
}

/**
 * Fetch the recursive git tree of the repository.
 */
export async function fetchRepoTree(owner, repo, branch, token) {
  const headers = {};
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file tree for branch ${branch}: ${response.statusText}`);
  }
  
  const data = await response.json();
  if (data.truncated) {
    console.warn("Git tree was truncated by GitHub API due to size limit.");
  }
  
  return data.tree || [];
}

/**
 * Fetch the content of a single file in raw format.
 */
export async function fetchFileContent(owner, repo, path, branch, token) {
  const headers = {
    "Accept": "application/vnd.github.v3.raw"
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }
  
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`,
    { headers }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file ${path}: ${response.statusText}`);
  }
  
  return await response.text();
}

/**
 * Checks if a file path is a code file that should be analyzed.
 */
export function isAnalyzableFile(path, size = 0) {
  // Ignore directories
  if (!path) return false;
  
  // File extension checks
  const extension = path.split('.').pop().toLowerCase();
  
  // List of extensions we want to analyze
  const allowedExtensions = [
    "html", "css", "js", "jsx", "ts", "tsx", 
    "py", "java", "sql", "json", "md",
    "xml", "yaml", "yml"
  ];
  
  if (!allowedExtensions.includes(extension)) {
    return false;
  }
  
  // Directories to ignore
  const ignoredDirectories = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    "out/",
    "target/",
    "vendor/",
    "env/",
    "venv/",
    ".idea/",
    ".vscode/",
    "public/assets/",
    "assets/img/",
    "assets/images/"
  ];
  
  if (ignoredDirectories.some(dir => path.startsWith(dir) || path.includes("/" + dir))) {
    return false;
  }
  
  // Files to ignore by name
  const ignoredFiles = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    "gradlew",
    "gradlew.bat",
    ".gitignore",
    ".eslintcache",
    ".prettierignore",
    "tsconfig.tsbuildinfo"
  ];
  
  const filename = path.split('/').pop();
  if (ignoredFiles.includes(filename)) {
    return false;
  }
  
  // Ignore large files (above 300KB) as they are likely generated files, data dumps or lockfiles
  if (size > 300 * 1024) {
    return false;
  }
  
  return true;
}

/**
 * Scan a repository and download all valid code files.
 * Provides a progress callback to notify the UI about current operations.
 */
export async function scanRepository(repoUrl, token, onProgress) {
  try {
    onProgress({ status: "parsing", message: "Parsing GitHub URL..." });
    const repoInfo = parseGitHubUrl(repoUrl);
    if (!repoInfo) {
      throw new Error("Invalid GitHub Repository URL. Please format as: https://github.com/owner/repo");
    }
    
    const { owner, repo } = repoInfo;
    onProgress({ status: "metadata", message: `Fetching repository metadata for ${owner}/${repo}...` });
    
    const repoDetails = await fetchRepoInfo(owner, repo, token);
    const branch = repoDetails.default_branch || "main";
    
    onProgress({ status: "tree", message: `Fetching repository file tree (${branch} branch)...` });
    const fullTree = await fetchRepoTree(owner, repo, branch, token);
    
    // Filter tree elements to code files
    const codeFiles = fullTree.filter(entry => {
      return entry.type === "blob" && isAnalyzableFile(entry.path, entry.size);
    });
    
    if (codeFiles.length === 0) {
      throw new Error("No readable code files found in the repository.");
    }
    
    onProgress({ 
      status: "downloading", 
      message: `Found ${codeFiles.length} source files. Commencing full repository download...`,
      total: codeFiles.length,
      current: 0
    });
    
    const fetchedFiles = [];
    // We can fetch files sequentially or with slight concurrency. 
    // Since rate limits and network errors can happen, we fetch sequentially but quickly.
    for (let i = 0; i < codeFiles.length; i++) {
      const file = codeFiles[i];
      onProgress({ 
        status: "downloading", 
        message: `Downloading file: ${file.path}`,
        total: codeFiles.length,
        current: i + 1,
        currentFile: file.path
      });
      
      try {
        const content = await fetchFileContent(owner, repo, file.path, branch, token);
        fetchedFiles.push({
          path: file.path,
          size: file.size,
          content: content
        });
      } catch (err) {
        console.error(`Failed to download ${file.path}:`, err);
        // Continue downloading other files, don't fail the whole scan for one bad download
      }
    }
    
    onProgress({ status: "complete", message: "Repository downloaded successfully!" });
    return {
      owner,
      repo,
      branch,
      commitSha: repoDetails.pushed_at || "latest",
      files: fetchedFiles
    };
    
  } catch (error) {
    onProgress({ status: "error", message: error.message });
    throw error;
  }
}

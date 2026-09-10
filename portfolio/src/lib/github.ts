export type GithubProfile = {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  location: string | null;
  email: string | null;
  blog: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
};

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  fork: boolean;
  archived: boolean;
  updated_at: string;
};

export class GithubError extends Error {
  code: "not-found" | "rate-limit" | "network" | "unknown";
  constructor(code: GithubError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

async function gh<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
  } catch {
    throw new GithubError("network", "Could not reach GitHub. Check your connection and retry.");
  }
  if (res.status === 404)
    throw new GithubError("not-found", "GitHub user not found. Check the username and try again.");
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const when = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : "soon";
    throw new GithubError(
      "rate-limit",
      `GitHub rate limit reached. Try again after ${when}.`
    );
  }
  if (!res.ok) throw new GithubError("unknown", `GitHub request failed (${res.status}).`);
  return (await res.json()) as T;
}

export const fetchGithubProfile = (username: string) =>
  gh<GithubProfile>(`/users/${encodeURIComponent(username.trim())}`);

export async function fetchGithubRepos(username: string): Promise<GithubRepo[]> {
  const repos = await gh<GithubRepo[]>(
    `/users/${encodeURIComponent(username.trim())}/repos?per_page=100&sort=updated`
  );
  return repos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.id - a.id);
}

import { useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

interface LoginResponse {
  token: string;
}

interface SearchResponse {
  hits?: {
    hits?: Array<{ _source: Record<string, unknown> }>;
  };
}

const App = () => {
  const [email, setEmail] = useState("admin@soc.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [token, setToken] = useState<string>("");
  const [query, setQuery] = useState("error");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [status, setStatus] = useState<string>("");

  const login = async () => {
    setStatus("Logging in...");
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      setStatus("Login failed");
      return;
    }
    const data = (await response.json()) as LoginResponse;
    setToken(data.token);
    setStatus("Logged in");
  };

  const search = async () => {
    setStatus("Searching...");
    const response = await fetch(
      `${apiUrl}/api/v1/search?q=${encodeURIComponent(query)}&page=1&size=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!response.ok) {
      setStatus("Search failed");
      return;
    }
    const data = (await response.json()) as SearchResponse;
    const hits = data.hits?.hits ?? [];
    setResults(hits.map((hit) => hit._source));
    setStatus(`Found ${hits.length} events`);
  };

  return (
    <div className="page">
      <header>
        <h1>SOC Logging, Monitoring & Auditing</h1>
        <p className="subtitle">Admin UI</p>
      </header>
      <section className="panel">
        <h2>Login</h2>
        <div className="grid">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              value={password}
              type="password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>
        <button onClick={login}>Sign in</button>
      </section>
      <section className="panel">
        <h2>Search Logs</h2>
        <label>
          Query
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button disabled={!token} onClick={search}>
          Run search
        </button>
        <div className="status">{status}</div>
        <ul className="results">
          {results.map((result, index) => (
            <li key={index}>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default App;

import { SandboxShell } from "./components/SandboxShell";

export const metadata = {
  title: "Cube Sandbox",
  description: "Isolated cube-first experimentation route for v2.0",
};

export default function CubeSandboxPage() {
  return <SandboxShell />;
}

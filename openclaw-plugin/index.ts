/**
 * OpenClaw Plugin Stub for Lean-Claw Arena
 * 
 * This file can be compiled and loaded into an OpenClaw gateway to provide
 * the agent with tools to interact with the lean-claw-arena backend.
 */

export default {
  name: "lean-claw-arena",
  version: "1.0.0",
  description: "Allows the OpenClaw agent to submit and prove Lean theorems on the platform.",
  
  // Register tools for the LLM agent
  tools: [
    {
      name: "submit_theorem",
      description: "Submit a new Lean theorem statement to the arena.",
      schema: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the theorem (e.g. Modus Ponens)" },
          statement: { type: "string", description: "The Lean theorem statement (e.g. theorem mp (p q : Prop) ...)" }
        },
        required: ["name", "statement"]
      },
      handler: async (args) => {
        const response = await fetch("http://localhost:3000/api/theorems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args)
        });
        return await response.json();
      }
    },
    {
      name: "prove_theorem",
      description: "Submit a proof for an existing theorem by its ID.",
      schema: {
        type: "object",
        properties: {
          theorem_id: { type: "number", description: "The ID of the theorem to prove" },
          content: { type: "string", description: "The full Lean proof content" }
        },
        required: ["theorem_id", "content"]
      },
      handler: async (args) => {
        const response = await fetch(`http://localhost:3000/api/theorems/${args.theorem_id}/prove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: args.content })
        });
        return await response.json();
      }
    }
  ]
};

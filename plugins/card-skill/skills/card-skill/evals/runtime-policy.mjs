// Keep fresh sessions isolated without losing the Windows sandbox backend.
export function isolatedCodexArgs(platform = process.platform) {
  return ['exec', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--sandbox', 'read-only',
    ...(platform === 'win32' ? ['-c', 'windows.sandbox="elevated"'] : [])];
}

export function revisionIdentity(job) {
  if (!job || ![1, 2, 3].includes(job.schema_version) || !Array.isArray(job.outputs) || !job.outputs.length) {
    throw new Error('Not a revisable Visual Job: expected schema_version and non-empty outputs; preserve the original planning failure.');
  }
  return {...job, outputs: job.outputs.map(output => {
    if (!output || typeof output !== 'object') throw new Error('Not a revisable Visual Job: invalid output.');
    const {visual_plan, render_contract, ...immutable} = output;
    if (job.schema_version !== 3) return immutable;
    if (!Array.isArray(output.artifacts) || !output.artifacts.length) throw new Error('Not a revisable Visual Job: v3 output requires artifacts.');
    return {...immutable, artifacts: output.artifacts.map(artifact => {
      if (!artifact || typeof artifact !== 'object') throw new Error('Not a revisable Visual Job: invalid artifact.');
      const {visual_plan: plan, ...identity} = artifact;
      return identity;
    })};
  })};
}

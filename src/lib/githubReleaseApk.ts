export type GithubReleaseApkConfig = {
  owner: string;
  repo: string;
  tag: string;
  assetName: string;
  token?: string;
};

type GithubReleaseAsset = {
  name: string;
  url: string;
  browser_download_url: string;
};

type GithubReleaseResponse = {
  assets: GithubReleaseAsset[];
};

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

function githubApiHeaders(token?: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Domyślnie: release `android-latest` z workflow CI (jeden APK dla całej platformy). */
export function resolveGithubReleaseApkConfig(): GithubReleaseApkConfig | undefined {
  const repoSlug = trimEnv(process.env.WERKIT_GITHUB_REPO) ?? 'mbatorowicz/Werkit';
  const parts = repoSlug.split('/').filter(Boolean);
  if (parts.length !== 2) return undefined;

  return {
    owner: parts[0],
    repo: parts[1],
    tag: trimEnv(process.env.WERKIT_ANDROID_RELEASE_TAG) ?? 'android-latest',
    assetName: trimEnv(process.env.WERKIT_ANDROID_APK_ASSET) ?? 'werkit.apk',
    token: trimEnv(process.env.WERKIT_GITHUB_RELEASE_TOKEN) ?? trimEnv(process.env.GITHUB_TOKEN),
  };
}

export async function fetchGithubReleaseApkBytes(
  config: GithubReleaseApkConfig,
): Promise<{ bytes: Uint8Array; assetName: string }> {
  const releaseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/releases/tags/${encodeURIComponent(config.tag)}`;
  const releaseRes = await fetch(releaseUrl, {
    headers: githubApiHeaders(config.token),
    cache: 'no-store',
  });

  if (!releaseRes.ok) {
    throw new Error(`github_release_${releaseRes.status}`);
  }

  const release = (await releaseRes.json()) as GithubReleaseResponse;
  const asset = release.assets.find((a) => a.name === config.assetName);
  if (!asset) {
    throw new Error('github_asset_missing');
  }

  const assetRes = await fetch(asset.url, {
    headers: {
      ...githubApiHeaders(config.token),
      Accept: 'application/octet-stream',
    },
    cache: 'no-store',
  });

  if (!assetRes.ok) {
    throw new Error(`github_asset_${assetRes.status}`);
  }

  const buffer = await assetRes.arrayBuffer();
  return { bytes: new Uint8Array(buffer), assetName: asset.name };
}

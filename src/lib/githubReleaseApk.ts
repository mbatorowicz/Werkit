import { APK_META_ASSET_NAME, parseAndroidApkMeta, type AndroidApkMeta } from '@/lib/apkMeta';

export type GithubReleaseApkConfig = {
  owner: string;
  repo: string;
  tag: string;
  assetName: string;
  metaAssetName: string;
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
    metaAssetName: trimEnv(process.env.WERKIT_ANDROID_APK_META_ASSET) ?? APK_META_ASSET_NAME,
    token: trimEnv(process.env.WERKIT_GITHUB_RELEASE_TOKEN) ?? trimEnv(process.env.GITHUB_TOKEN),
  };
}

async function fetchGithubRelease(config: GithubReleaseApkConfig): Promise<GithubReleaseResponse> {
  const releaseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/releases/tags/${encodeURIComponent(config.tag)}`;
  const releaseRes = await fetch(releaseUrl, {
    headers: githubApiHeaders(config.token),
    cache: 'no-store',
  });

  if (!releaseRes.ok) {
    throw new Error(`github_release_${releaseRes.status}`);
  }

  return (await releaseRes.json()) as GithubReleaseResponse;
}

async function fetchGithubAssetText(config: GithubReleaseApkConfig, asset: GithubReleaseAsset): Promise<string> {
  const assetRes = await fetch(asset.url, {
    headers: {
      ...githubApiHeaders(config.token),
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  });

  if (!assetRes.ok) {
    throw new Error(`github_asset_${assetRes.status}`);
  }

  const download = (await assetRes.json()) as { url?: string };
  if (!download.url) {
    throw new Error('github_asset_url_missing');
  }

  const bytesRes = await fetch(download.url, {
    headers: {
      ...githubApiHeaders(config.token),
      Accept: 'application/octet-stream',
    },
    cache: 'no-store',
  });

  if (!bytesRes.ok) {
    throw new Error(`github_asset_bytes_${bytesRes.status}`);
  }

  return bytesRes.text();
}

export async function fetchGithubReleaseApkMeta(config: GithubReleaseApkConfig): Promise<AndroidApkMeta | null> {
  const release = await fetchGithubRelease(config);
  const metaAsset = release.assets.find((a) => a.name === config.metaAssetName);
  if (!metaAsset) return null;

  try {
    const text = await fetchGithubAssetText(config, metaAsset);
    return parseAndroidApkMeta(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

export async function isGithubReleaseApkAvailable(config: GithubReleaseApkConfig): Promise<boolean> {
  try {
    const release = await fetchGithubRelease(config);
    return release.assets.some((a) => a.name === config.assetName);
  } catch {
    return false;
  }
}

export async function fetchGithubReleaseApkBytes(
  config: GithubReleaseApkConfig,
): Promise<{ bytes: Uint8Array; assetName: string }> {
  const release = await fetchGithubRelease(config);
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

import Conf from 'conf'
import os from 'os'
import path from 'path'

export interface Profile {
  orgId: string
  orgName: string
  email: string
  clerkUserId: string
  environment: 'live' | 'test'
}

export interface Config {
  currentProfile: string
  profiles: Record<string, Profile>
  apiEndpoint: string
}

const defaults: Config = {
  currentProfile: 'default',
  profiles: {},
  apiEndpoint: 'https://chainvue.io',
}

export const config = new Conf<Config>({
  projectName: 'chainvue',
  defaults,
  cwd: path.join(os.homedir(), '.config', 'chainvue'),
})

export function getCurrentProfile(): Profile | null {
  const profileName = config.get('currentProfile')
  const profiles = config.get('profiles')
  return profiles[profileName] || null
}

export function setCurrentProfile(name: string, profile: Profile): void {
  const profiles = config.get('profiles')
  profiles[name] = profile
  config.set('profiles', profiles)
  config.set('currentProfile', name)
}

export function deleteProfile(name: string): void {
  const profiles = config.get('profiles')
  delete profiles[name]
  config.set('profiles', profiles)

  if (config.get('currentProfile') === name) {
    const remaining = Object.keys(profiles)
    config.set('currentProfile', remaining[0] || 'default')
  }
}

export function listProfiles(): Record<string, Profile> {
  return config.get('profiles')
}

export function getApiEndpoint(): string {
  return config.get('apiEndpoint')
}

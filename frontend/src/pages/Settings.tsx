import { useEffect, useMemo, useState } from 'react'
import { deleteUser, getUsers, type User as ManagedUser } from '../api/admin'
import { getApiErrorMessage } from '../api/client'
import { adminCleanSources, cleanSources } from '../api/operations'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingButton } from '../components/ui/LoadingButton'
import { OperationShell } from '../components/ui/OperationShell'
import { StatusMessage } from '../components/ui/StatusMessage'
import { useAuth } from '../hooks/useAuth'

type UserAction =
  | { type: 'clean'; user: ManagedUser }
  | { type: 'delete'; user: ManagedUser }
  | null

export default function Settings() {
  const { username, role } = useAuth()
  const [confirmClean, setConfirmClean] = useState(false)
  const [userAction, setUserAction] = useState<UserAction>(null)
  const [userQuery, setUserQuery] = useState('')
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [userActionRunning, setUserActionRunning] = useState(false)
  const [message, setMessage] = useState('')

  const isAdmin = role === 'admin'
  const targetUsername = username ?? (isAdmin ? 'admin' : 'user')
  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase()
    if (!normalizedQuery) return managedUsers.slice(0, 25)
    return managedUsers.filter((user) =>
      user.username.toLowerCase().includes(normalizedQuery),
    ).slice(0, 25)
  }, [managedUsers, userQuery])

  const loadUsers = async () => {
    if (!isAdmin) return

    setLoadingUsers(true)
    try {
      const users = await getUsers()
      setManagedUsers(users)
    } catch (err) {
      setManagedUsers([])
      setMessage(getApiErrorMessage(err, 'Unable to load users.'))
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [isAdmin])

  const handleClean = async () => {
    setCleaning(true)
    setMessage('')
    try {
      const res = isAdmin
        ? await adminCleanSources(true, targetUsername)
        : await cleanSources(true)
      setMessage(res.message)
    } catch (err) {
      setMessage(getApiErrorMessage(err, 'Error while cleaning the metadata layer.'))
    } finally {
      setCleaning(false)
      setConfirmClean(false)
    }
  }

  const handleUserAction = async () => {
    if (!userAction) return

    setUserActionRunning(true)
    setMessage('')
    try {
      const res = userAction.type === 'clean'
        ? await adminCleanSources(true, userAction.user.username)
        : await deleteUser(userAction.user.username)
      setMessage(res.message)
      if (userAction.type === 'delete') {
        await loadUsers()
      }
    } catch (err) {
      setMessage(getApiErrorMessage(
        err,
        userAction.type === 'clean'
          ? 'Error while cleaning user metadata.'
          : 'Error while deleting the user.',
      ))
    } finally {
      setUserActionRunning(false)
      setUserAction(null)
    }
  }

  return (
    <OperationShell title="Settings" description="Account and application preferences">
      <div className="space-y-5 max-w-4xl">
      {message && (
        <StatusMessage tone="info">
          {message}
        </StatusMessage>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-5 max-w-xl">
        <p className="text-sm font-medium text-gray-900 mb-4">Account</p>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-10 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Username</p>
            <p className="font-medium text-gray-900">{username ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Role</p>
            <p className="font-medium text-gray-900 capitalize">{role ?? '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Clean metadata layer</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Remove all sources associated with this account from the Metadata layer.
            </p>
          </div>
          <LoadingButton
            type="button"
            onClick={() => setConfirmClean(true)}
            loading={cleaning}
            loadingLabel="Cleaning..."
            className="w-full md:w-auto px-4 py-2 border border-red-300 bg-white text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
          >
            Clean metadata layer
          </LoadingButton>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">User management</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Manage users, clean a user's metadata layer, or remove user accounts.
              </p>
            </div>
            <div className="w-full lg:w-72">
              <label className="block text-xs text-gray-500 mb-1.5">Search user</label>
              <input
                type="text"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="Search by username"
                disabled={loadingUsers || managedUsers.length === 0}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="text-sm text-gray-400 py-10">Loading users...</div>
          ) : managedUsers.length === 0 ? (
            <EmptyState
              message="No user available."
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((managedUser) => {
                const isCurrentUser = managedUser.username === username

                return (
                  <div
                    key={managedUser.username}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{managedUser.username}</p>
                      <p className="text-xs text-gray-400">
                        {managedUser.role ?? 'user'}
                        {managedUser.createdAt ? ` - created ${managedUser.createdAt}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setUserAction({ type: 'clean', user: managedUser })}
                        className="px-3 py-2 border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
                      >
                        Clean metadata
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserAction({ type: 'delete', user: managedUser })}
                        disabled={isCurrentUser}
                        className="px-3 py-2 border border-red-300 bg-white text-red-600 hover:bg-red-50 disabled:border-red-100 disabled:text-red-300 disabled:bg-white text-xs font-medium rounded-lg transition-colors"
                        title={isCurrentUser ? 'You cannot delete the current account.' : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
              {filteredUsers.length === 0 && (
                <EmptyState message="No user matches the search." className="py-10" />
              )}
              {filteredUsers.length === 25 && (
                <p className="text-[11px] text-gray-400 pt-1">
                  Showing first 25 users. Refine the search to narrow the results.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      <ConfirmDialog
        open={confirmClean}
        title="Clean metadata layer"
        description={
          isAdmin
            ? `This will remove all sources for user "${targetUsername}" from the Metadata layer. Continue?`
            : 'This will remove all your sources from the Metadata layer. Continue?'
        }
        confirmLabel="Clean"
        tone="danger"
        loading={cleaning}
        onCancel={() => {
          if (!cleaning) setConfirmClean(false)
        }}
        onConfirm={() => void handleClean()}
      />

      <ConfirmDialog
        open={userAction !== null}
        title={userAction?.type === 'delete' ? 'Delete user' : 'Clean user metadata'}
        description={
          userAction?.type === 'delete'
            ? `This will permanently delete user "${userAction.user.username}". Continue?`
            : `This will remove all sources for user "${userAction?.user.username ?? ''}" from the Metadata layer. Continue?`
        }
        confirmLabel={userAction?.type === 'delete' ? 'Delete' : 'Clean'}
        tone="danger"
        loading={userActionRunning}
        onCancel={() => {
          if (!userActionRunning) setUserAction(null)
        }}
        onConfirm={() => void handleUserAction()}
      />
    </OperationShell>
  )
}

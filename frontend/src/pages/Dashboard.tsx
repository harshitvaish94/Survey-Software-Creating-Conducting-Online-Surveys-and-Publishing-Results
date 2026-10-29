import { useAuth } from '../auth/context'

export default function Dashboard() {
  const { user } = useAuth()
  return (
    <>
      <h1>Dashboard</h1>
      <p>
        Signed in as <strong>{user?.email}</strong>
      </p>
      <section className="hero">
        <h2>No surveys yet</h2>
        <p>Your surveys will appear here once you create one.</p>
      </section>
    </>
  )
}
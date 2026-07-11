import LookupSelect from './LookupSelect'

/** Driver dropdown — HR Driver employees + drivers table, with quick-create. */
export default function DriverLookupSelect(props) {
  return (
    <LookupSelect
      type="drivers"
      placeholder="Search driver…"
      {...props}
    />
  )
}

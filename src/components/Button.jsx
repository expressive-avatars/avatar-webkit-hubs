export function Button({ ...props }) {
  return (
    <button
      class="border-2 border-hubs-blue text-hubs-blue active:bg-hubs-lightblue active:text-white
        rounded-xl px-4 py-2 grid grid-flow-col gap-2 place-items-center
        focus:outline-none"
      {...props}
    />
  )
}

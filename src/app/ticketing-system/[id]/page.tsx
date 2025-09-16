import { redirect } from "next/navigation";

export default function Page(_props: unknown) {
  const { params } = _props as { params: { id: string } };
  const { id } = params;
  redirect(`/ticketing-system/tickets/${id}`);
  return null;
}

// src/app/[lng]/(auth)/todos/[id]/edit/page.tsx
import { getTodo } from "@/lib/actions/todos";
import { TodoForm } from "../../components/todo-form";
import { notFound } from "next/navigation";

interface EditTodoPageProps {
  params: Promise<{ lng: string; id: string }>;
}

export default async function EditTodoPage({ params }: EditTodoPageProps) {
  const { lng, id } = await params;

  try {
    const todo = await getTodo(id);
    return <TodoForm lng={lng} todo={todo} mode="edit" />;
  } catch (error) {
    console.error("Failed to fetch todo:", error);
    notFound();
  }
}
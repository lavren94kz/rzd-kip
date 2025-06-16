// src/app/[lng]/(auth)/todos/new/page.tsx
import { TodoForm } from "../components/todo-form";

interface NewTodoPageProps {
  params: Promise<{ lng: string }>;
}

export default async function NewTodoPage({ params }: NewTodoPageProps) {
  const { lng } = await params;

  return <TodoForm lng={lng} mode="create" />;
}
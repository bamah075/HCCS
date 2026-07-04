import UserDetailView from "src/sections/users/UserDetailView";

export default function Page({ params }) {
    return <UserDetailView id={params.id} />;
}

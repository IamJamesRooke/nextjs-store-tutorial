import Image from "next/image";
import { LuUser2 } from "react-icons/lu";
import { currentUser, auth } from "@clerk/nextjs/server";

async function UserIcon() {
  // const {userId} = auth();
  const user = await currentUser();
  const profileImage = user?.imageUrl;

  if (profileImage) {
    return (
      <Image
        src={profileImage}
        alt="User profile"
        width={24}
        height={24}
        className="rounded-full object-cover"
      />
    );
  }
  return <LuUser2 className ='w-6 h-6 bg-primary rounded-full text-white'/>;
}

export default UserIcon;

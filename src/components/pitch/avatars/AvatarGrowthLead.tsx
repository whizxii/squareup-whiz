import avatarImg from "@/assets/avatar-growth-lead.png";

const AvatarGrowthLead = ({ size = 220 }: { size?: number }) => (
  <img
    src={avatarImg}
    alt="Growth & Marketing Lead"
    width={size}
    height={size}
    style={{ width: size, height: size, objectFit: "contain", display: "block" }}
  />
);

export default AvatarGrowthLead;

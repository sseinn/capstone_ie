import kakaoLoginImage from "@/assets/kakao_login_large_narrow.png";

export default function KakaoLoginButton() {
  const handleKakaoLogin = () => {
    const baseURL = import.meta.env.VITE_API_BASE_URL; // 백엔드 주소
    const frontendURL = window.location.origin; // 프론트 배포 URL

    const redirectUrl = encodeURIComponent(`${frontendURL}/auth/success`);

    window.location.href = `${baseURL}/oauth2/authorization/kakao?redirect=${redirectUrl}`;
  };

  return (
    <button onClick={handleKakaoLogin}>
      <img
        src={kakaoLoginImage}
        alt="카카오 로그인"
        className="w-[222px] h-[49px]"
      />
    </button>
  );
}

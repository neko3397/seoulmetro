// PNG 등 이미지 파일 import를 위한 타입 선언
declare module "*.png" {
    const value: string;
    export default value;
}

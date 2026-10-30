using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

/// <summary>Dijalankan lewat -executeMethod, supaya pengaturan proyek hidup di kode dan bisa diulang.</summary>
public static class KartBuild
{
    const string ScenePath = "Assets/Scenes/Spike.unity";
    const string ExportPath = "../android/unity-export";

    public static void Setup()
    {
        Directory.CreateDirectory("Assets/Settings");
        Directory.CreateDirectory("Assets/Scenes");

        var renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
        AssetDatabase.CreateAsset(renderer, "Assets/Settings/KartRenderer.asset");
        var urp = UniversalRenderPipelineAsset.Create(renderer);
        AssetDatabase.CreateAsset(urp, "Assets/Settings/KartURP.asset");
        GraphicsSettings.defaultRenderPipeline = urp;
        QualitySettings.renderPipeline = urp;

        PlayerSettings.companyName = "Couple Party";
        PlayerSettings.productName = "Kart Kacau";
        PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.couple.party");
        PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7 | AndroidArchitecture.ARM64;
        PlayerSettings.Android.applicationEntry = AndroidApplicationEntry.Activity;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.Android, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.Android, new[] { GraphicsDeviceType.OpenGLES3 });
        PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
        PlayerSettings.allowedAutorotateToPortrait = false;
        PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
        PlayerSettings.allowedAutorotateToLandscapeLeft = true;
        PlayerSettings.allowedAutorotateToLandscapeRight = true;
        EditorUserBuildSettings.androidBuildSubtarget = MobileTextureSubtarget.ASTC;

        var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
        var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.name = "Spike";
        cube.AddComponent<SpikeCube>();
        cube.GetComponent<Renderer>().sharedMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        AssetDatabase.CreateAsset(cube.GetComponent<Renderer>().sharedMaterial, "Assets/Settings/Spike.mat");
        Camera.main.transform.position = new Vector3(0, 1, -4);
        Camera.main.transform.LookAt(Vector3.zero);
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
    }

    public static void ExportAndroid()
    {
        // APK diunduh utuh tiap update, jadi ukuran lebih penting daripada kecepatan build.
        PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.High);
        PlayerSettings.SetIl2CppCodeGeneration(NamedBuildTarget.Android, Il2CppCodeGeneration.OptimizeSize);
        EditorUserBuildSettings.exportAsGoogleAndroidProject = true;
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = ExportPath,
            target = BuildTarget.Android,
            options = BuildOptions.None,
        });
        Debug.Log($"KartBuild export: {report.summary.result}, {report.summary.totalErrors} error");
        if (report.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
    }
}
